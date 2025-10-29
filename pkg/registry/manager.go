// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

package registry

import (
	"fmt"
	"sync"
)

// Manager manages multiple registry clients
type Manager struct {
	clients map[string]Client
	mu      sync.RWMutex
}

// NewManager creates a new registry manager from configs
func NewManager(configs []RegistryConfig) (*Manager, error) {
	if len(configs) == 0 {
		return nil, fmt.Errorf("no registry configurations provided")
	}

	manager := &Manager{
		clients: make(map[string]Client),
	}

	for _, config := range configs {
		client := NewClient(config)
		manager.clients[config.Name] = client
	}

	return manager, nil
}

// GetClient returns a client by registry name
func (m *Manager) GetClient(name string) (Client, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, ok := m.clients[name]
	if !ok {
		return nil, fmt.Errorf("registry '%s' not found", name)
	}

	return client, nil
}

// GetAllClients returns all registry clients
func (m *Manager) GetAllClients() []Client {
	m.mu.RLock()
	defer m.mu.RUnlock()

	clients := make([]Client, 0, len(m.clients))
	for _, client := range m.clients {
		clients = append(clients, client)
	}

	return clients
}

// GetRegistryNames returns all registry names
func (m *Manager) GetRegistryNames() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	names := make([]string, 0, len(m.clients))
	for name := range m.clients {
		names = append(names, name)
	}

	return names
}
