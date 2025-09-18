import { usePage, usePoll } from "@inertiajs/react";
import React, { createContext, type ReactNode, useContext } from "react";

interface RepositoryData {
	id: number;
	name: string;
	namespace?: string;
	fullName: string;
	source: string;
	tagCount: number;
	totalSize: number;
	totalSizeFormatted: string;
	tagsList: string[];
	architectures: string[];
	registryHost: string;
}

interface SourceData {
	key: string;
	host: string;
	status: number;
}

interface RegistryContextType {
	repositories: RepositoryData[];
	availableArchitectures: string[];
	sources: Record<string, SourceData>;
	loading: boolean;
}

const RegistryContext = createContext<RegistryContextType | undefined>(
	undefined,
);

interface RegistryProviderProps {
	children: ReactNode;
}

export function RegistryProvider({ children }: RegistryProviderProps) {
	const { props } = usePage<{
		repositories?: RepositoryData[];
		availableArchitectures?: string[];
		sources?: Record<string, SourceData>;
	}>();

	usePoll(2000,{ only: ["repositories", "availableArchitectures", "sources"] });

	const contextValue: RegistryContextType = {
		repositories: props.repositories || [],
		availableArchitectures: props.availableArchitectures || [],
		sources: props.sources || {},
		loading: false, // Since we're using Inertia deferred props, we can track this differently
	};

	return (
		<RegistryContext.Provider value={contextValue}>
			{children}
		</RegistryContext.Provider>
	);
}

export function useRegistry() {
	const context = useContext(RegistryContext);
	if (context === undefined) {
		throw new Error("useRegistry must be used within a RegistryProvider");
	}
	return context;
}

// Helper hook for status functions
export function useRegistryHelpers() {
	const getStatusChipColor = (status: number) => {
		if (status >= 200 && status < 300) return "success";
		if (status >= 300 && status < 400) return "info";
		if (status >= 400 && status < 500) return "warning";
		if (status >= 500) return "error";
		if (status === -1) return "default";
		return "default";
	};

	const getStatusTooltip = (status: number) => {
		if (status === -1) return "Not checked yet";
		if (status === 200) return "200: OK";
		if (status >= 400) return `${status}: Error`;
		return `Status: ${status}`;
	};

	const getSourceHost = (
		sources: Record<string, SourceData>,
		sourceName?: string,
	) => {
		if (!sourceName || !sources[sourceName]) {
			return "Unknown";
		}
		return sources[sourceName].host;
	};

	return {
		getStatusChipColor,
		getStatusTooltip,
		getSourceHost,
	};
}
