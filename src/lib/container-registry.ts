export interface ArchitectureInfo {
	architecture: string;
	digest: string;
	size: string;
	os: string;
	variant?: string;
}

export interface SourceInfo {
	path: string;
	host: string;
	status?: number;
	lastChecked?: number;
}

interface ManifestReference {
	digest: string;
	annotations?: {
		[key: string]: string;
	};
	platform?: {
		architecture: string;
		os: string;
		variant?: string;
	};
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs: number = 3000,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	return fetch(url, {
		...options,
		signal: controller.signal,
	}).finally(() => {
		clearTimeout(timeoutId);
	});
}

export class Blob {
	constructor(
		public readonly digest: string,
		public readonly size: number,
		public readonly mediaType: string,
		private readonly client: ContainerRegistryClient,
		private readonly repositoryName: string,
	) {}

	async exists(): Promise<boolean> {
		try {
			const url = `${this.client.registry.sourcePath}/v2/${this.repositoryName}/blobs/${this.digest}`;
			const response = await fetchWithTimeout(url, { method: "HEAD" });
			return response.ok;
		} catch (_error) {
			return false;
		}
	}

	async data(): Promise<ArrayBuffer> {
		const url = `${this.client.registry.sourcePath}/v2/${this.repositoryName}/blobs/${this.digest}`;
		const response = await fetchWithTimeout(url);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch blob ${this.digest}: ${response.statusText}`,
			);
		}
		return response.arrayBuffer();
	}

	async json(): Promise<any> {
		if (!this.mediaType.includes("json")) {
			throw new Error(
				`Blob ${this.digest} is not JSON (mediaType: ${this.mediaType})`,
			);
		}
		const data = await this.data();
		return JSON.parse(new TextDecoder().decode(data));
	}

	get formattedSize(): string {
		return formatBytes(this.size);
	}
}

export class ConfigBlob {
	constructor(
		public readonly digest: string,
		public readonly size: number,
		public readonly mediaType: string,
		public readonly architecture: string,
		public readonly os: string,
		public readonly variant: string | undefined,
		public readonly created: string | null,
		public readonly config: {
			ExposedPorts?: { [port: string]: {} };
			Env?: string[];
			Entrypoint?: string[];
			Cmd?: string[];
			WorkingDir?: string;
			Labels?: { [key: string]: string };
			StopSignal?: string;
			ArgsEscaped?: boolean;
		},
		public readonly history?: Array<{
			created?: string;
			created_by?: string;
			comment?: string;
			empty_layer?: boolean;
		}>,
		public readonly rootfs?: {
			type: string;
			diff_ids: string[];
		},
		private readonly rawData?: any,
	) {}

	get formattedSize(): string {
		return formatBytes(this.size);
	}

	getRawData(): any {
		return this.rawData;
	}
}

export interface LayerInfo {
	digest: string;
	size: number;
	mediaType: string;
}

export class ImageConfig {
	constructor(
		private readonly _blob: Blob,
		public readonly architecture: string,
		public readonly os: string,
		public readonly variant: string | undefined,
		public readonly created: string | null,
	) {}

	async blob(): Promise<ConfigBlob> {
		const configData = await this._blob.json();

		return new ConfigBlob(
			this._blob.digest,
			this._blob.size,
			this._blob.mediaType,
			configData.architecture || this.architecture,
			configData.os || this.os,
			configData.variant || this.variant,
			configData.created || this.created,
			configData.config || {},
			configData.history,
			configData.rootfs,
			configData,
		);
	}

	async hasBlob(): Promise<boolean> {
		return this._blob.exists();
	}
}

export class Image {
	constructor(
		public readonly architecture: string,
		public readonly os: string,
		public readonly variant: string | undefined,
		public readonly digest: string,
		public readonly size: number,
		public readonly config: ImageConfig,
		public readonly layers: LayerInfo[],
		readonly _client: ContainerRegistryClient,
		readonly _repositoryName: string,
	) {}

	get formattedSize(): string {
		return formatBytes(this.size);
	}

	get architectureInfo(): ArchitectureInfo {
		return {
			architecture: this.architecture,
			digest: this.digest,
			size: this.formattedSize,
			os: this.os,
			variant: this.variant,
		};
	}

	get created(): string | null {
		return this.config.created;
	}
}

export class Manifest {
	constructor(
		public readonly digest: string,
		public readonly mediaType: string,
		public readonly size: number,
		public readonly raw: any,
		private readonly client: ContainerRegistryClient,
		private readonly repositoryName: string,
		private readonly tagName: string,
	) {}

	async isUpToDate(knownDigest?: string): Promise<boolean> {
		if (!knownDigest) return false;

		try {
			const url = `${this.client.registry.sourcePath}/v2/${encodeURIComponent(this.repositoryName)}/manifests/${this.tagName}`;
			const response = await fetchWithTimeout(url, {
				method: "HEAD",
				headers: {
					"If-None-Match": knownDigest,
					Accept:
						"application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json",
				},
			});

			return response.status === 304; // Not Modified
		} catch (_error) {
			return false;
		}
	}

	isMultiPlatform(): boolean {
		return (
			this.mediaType ===
				"application/vnd.docker.distribution.manifest.list.v2+json" ||
			this.mediaType === "application/vnd.oci.image.index.v1+json"
		);
	}

	async images(): Promise<Image[]> {
		if (this.isMultiPlatform()) {
			return this.childImages();
		}

		const image = await this.singleImage();
		return image ? [image] : [];
	}

	async childManifests(): Promise<Manifest[]> {
		if (!this.isMultiPlatform() || !this.raw.manifests) return [];

		const imageManifests = this.raw.manifests.filter(
			(archManifest: ManifestReference) =>
				archManifest.annotations?.["vnd.docker.reference.type"] !==
				"attestation-manifest",
		);

		const manifestPromises = imageManifests.map(
			async (archManifest: ManifestReference) => {
				try {
					return await this.childManifest(archManifest.digest);
				} catch (error) {
					console.warn(
						`Failed to fetch child manifest ${archManifest.digest}:`,
						error,
					);
					return null;
				}
			},
		);

		const manifests = await Promise.all(manifestPromises);
		return manifests.filter(
			(manifest): manifest is Manifest => manifest !== null,
		);
	}

	private async childImages(): Promise<Image[]> {
		const childManifests = await this.childManifests();
		const imagePromises = childManifests.map((manifest) =>
			manifest.singleImage(),
		);
		const images = await Promise.all(imagePromises);
		return images.filter((image): image is Image => image !== null);
	}

	private async childManifest(digest: string): Promise<Manifest | null> {
		let acceptHeader = "";
		if (this.mediaType === "application/vnd.oci.image.index.v1+json") {
			acceptHeader = "application/vnd.oci.image.manifest.v1+json";
		} else if (
			this.mediaType ===
			"application/vnd.docker.distribution.manifest.list.v2+json"
		) {
			acceptHeader = "application/vnd.docker.distribution.manifest.v2+json";
		} else {
			acceptHeader =
				"application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json";
		}

		const url = `${this.client.registry.sourcePath}/v2/${this.repositoryName}/manifests/${digest}`;
		const response = await fetchWithTimeout(url, {
			headers: { Accept: acceptHeader },
		});

		if (!response.ok) return null;

		const manifestData = await response.json();
		const manifestDigest =
			response.headers.get("Docker-Content-Digest") || digest;

		return new Manifest(
			manifestDigest,
			manifestData.mediaType,
			0, // Size will be calculated
			manifestData,
			this.client,
			this.repositoryName,
			this.tagName,
		);
	}

	private async singleImage(): Promise<Image | null> {
		if (
			this.mediaType !==
				"application/vnd.docker.distribution.manifest.v2+json" &&
			this.mediaType !== "application/vnd.oci.image.manifest.v1+json"
		) {
			return null;
		}

		if (!this.raw.config || !this.raw.layers) return null;

		// Create config blob
		const configBlob = new Blob(
			this.raw.config.digest,
			this.raw.config.size || 0,
			this.raw.config.mediaType || "application/json",
			this.client,
			this.repositoryName,
		);

		const layers: LayerInfo[] = this.raw.layers.map((layer: any) => ({
			digest: layer.digest,
			size: layer.size || 0,
			mediaType: layer.mediaType || "application/octet-stream",
		}));

		// Get config info for architecture and OS
		const configInfo = await this.configInfo();
		const totalSize =
			(this.raw.config.size || 0) +
			this.raw.layers.reduce(
				(acc: number, layer: any) => acc + (layer.size || 0),
				0,
			);

		const imageConfig = new ImageConfig(
			configBlob,
			configInfo?.architecture || "amd64",
			configInfo?.os || "linux",
			configInfo?.variant,
			configInfo?.created || null,
		);

		return new Image(
			configInfo?.architecture || "amd64",
			configInfo?.os || "linux",
			configInfo?.variant,
			this.digest,
			totalSize,
			imageConfig,
			layers,
			this.client,
			this.repositoryName,
		);
	}

	private async configInfo(): Promise<{
		created: string | null;
		architecture: string;
		os: string;
		variant?: string;
	} | null> {
		try {
			const configBlob = new Blob(
				this.raw.config.digest,
				this.raw.config.size || 0,
				this.raw.config.mediaType || "application/json",
				this.client,
				this.repositoryName,
			);

			const data = await configBlob.json();
			return {
				created: data.created || data.history?.[0]?.created || null,
				architecture: data.architecture || "amd64",
				os: data.os || "linux",
				variant: data.variant,
			};
		} catch (error) {
			if (!(error instanceof TypeError)) {
				console.warn(
					`Failed to fetch config ${this.raw.config.digest}:`,
					error,
				);
			}
			return null;
		}
	}

	get formattedSize(): string {
		return formatBytes(this.size);
	}
}

export class Tag {
	constructor(
		public readonly name: string,
		public readonly lastUpdated: string,
		private readonly client: ContainerRegistryClient,
		private readonly repositoryName: string,
	) {}

	async manifest(): Promise<Manifest> {
		const url = `${this.client.registry.sourcePath}/v2/${encodeURIComponent(this.repositoryName)}/manifests/${this.name}`;
		const response = await fetchWithTimeout(url, {
			headers: {
				Accept:
					"application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`Failed to fetch manifest for ${this.repositoryName}:${this.name}: ${response.statusText}`,
			);
		}

		const manifestData = await response.json();
		const manifestDigest =
			response.headers.get("Docker-Content-Digest") || this.name;

		return new Manifest(
			manifestDigest,
			manifestData.mediaType,
			0, // Size will be calculated when images are retrieved
			manifestData,
			this.client,
			this.repositoryName,
			this.name,
		);
	}

	async delete(): Promise<boolean> {
		try {
			const manifest = await this.manifest();
			const sourcePath = this.client.registry.sourcePath.replace("/v2", ""); // Remove /v2 for delete API
			const deleteResponse = await fetchWithTimeout(
				`${sourcePath}/v2/${encodeURIComponent(this.repositoryName)}/manifests/${manifest.digest}`,
				{
					method: "DELETE",
					headers: {
						Accept: manifest.mediaType,
					},
				},
			);

			return deleteResponse.ok || deleteResponse.status === 404;
		} catch (error) {
			console.error("Failed to delete tag:", error);
			return false;
		}
	}
}

export class Repository {
	constructor(
		public readonly name: string,
		public readonly namespace: string | undefined,
		private readonly client: ContainerRegistryClient,
	) {}

	get fullName(): string {
		return this.namespace ? `${this.namespace}/${this.name}` : this.name;
	}

	async tags(): Promise<Tag[]> {
		const url = `${this.client.registry.sourcePath}/v2/${this.fullName}/tags/list`;
		const response = await fetchWithTimeout(url);

		if (!response.ok) {
			if (response.status === 404) return [];
			throw new Error(
				`Failed to fetch tags for ${this.fullName}: ${response.statusText}`,
			);
		}

		const data = await response.json();
		const tagNames = data.tags || [];

		return tagNames.map(
			(tagName: string) =>
				new Tag(tagName, new Date().toISOString(), this.client, this.fullName),
		);
	}

	async tag(tagName: string): Promise<Tag | null> {
		const allTags = await this.tags();
		return allTags.find((tag) => tag.name === tagName) || null;
	}

	async delete(): Promise<boolean> {
		try {
			const sourcePath = this.client.registry.sourcePath.replace("/v2", ""); // Remove /v2 for delete API
			const response = await fetchWithTimeout(
				`${sourcePath}/v2/${encodeURIComponent(this.fullName)}`,
				{ method: "DELETE" },
			);

			return response.ok || response.status === 404;
		} catch (error) {
			console.error("Failed to delete repository:", error);
			return false;
		}
	}
}

export class Registry {
	constructor(
		public readonly name: string,
		public readonly sourcePath: string,
		public readonly host: string = "",
		public status?: number,
		public lastChecked?: number,
	) {}

	get sourceInfo(): SourceInfo {
		return {
			path: this.sourcePath,
			host: this.host,
			status: this.status,
			lastChecked: this.lastChecked,
		};
	}

	async repositories(): Promise<Repository[]> {
		const url = `${this.sourcePath}/v2/_catalog`;
		const response = await fetchWithTimeout(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch catalog: ${response.statusText}`);
		}

		const data = await response.json();
		const repositoryNames = data.repositories || [];

		return repositoryNames.map((repoName: string) => {
			const parts = repoName.split("/");
			const name = parts.length > 1 ? parts[parts.length - 1] : repoName;
			const namespace =
				parts.length > 1 ? parts.slice(0, -1).join("/") : undefined;

			return new Repository(name, namespace, new ContainerRegistryClient(this));
		});
	}

	async repository(
		name: string,
		namespace?: string,
	): Promise<Repository | null> {
		const repos = await this.repositories();
		return (
			repos.find(
				(repo) => repo.name === name && repo.namespace === namespace,
			) || null
		);
	}

	async ping(): Promise<{ success: boolean; status: number }> {
		try {
			const url = `${this.sourcePath}/v2/`;
			const response = await fetchWithTimeout(url);
			return { success: response.ok, status: response.status };
		} catch (_error) {
			return { success: false, status: 0 };
		}
	}

	updateStatus(status: number): Registry {
		return new Registry(
			this.name,
			this.sourcePath,
			this.host,
			status,
			Date.now(),
		);
	}
}

export class ContainerRegistryClient {
	constructor(public readonly registry: Registry) {}

	static async fromSources(
		sources: Record<string, SourceInfo>,
	): Promise<ContainerRegistryClient[]> {
		return Object.entries(sources).map(
			([sourceName, sourceInfo]) =>
				new ContainerRegistryClient(
					new Registry(
						sourceName,
						sourceInfo.path,
						sourceInfo.host,
						sourceInfo.status,
						sourceInfo.lastChecked,
					),
				),
		);
	}

	async repositories(): Promise<Repository[]> {
		return this.registry.repositories();
	}

	async repository(
		name: string,
		namespace?: string,
	): Promise<Repository | null> {
		return this.registry.repository(name, namespace);
	}

	async ping(): Promise<{ success: boolean; status: number }> {
		return this.registry.ping();
	}
}
