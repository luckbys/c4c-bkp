// Client-side utility functions for instance management

// Helper function to get custom name for an instance from localStorage
export function getInstanceCustomName(instanceId: string, defaultName: string): string {
    if (typeof window === 'undefined') {
        // Return default name on server-side
        return defaultName;
    }
    
    try {
        const customNames = JSON.parse(localStorage.getItem('instanceCustomNames') || '{}');
        return customNames[instanceId] || defaultName;
    } catch (error) {
        return defaultName;
    }
}

// Helper function to set custom name for an instance in localStorage
export function setInstanceCustomName(instanceId: string, customName: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    
    try {
        const customNames = JSON.parse(localStorage.getItem('instanceCustomNames') || '{}');
        customNames[instanceId] = customName;
        localStorage.setItem('instanceCustomNames', JSON.stringify(customNames));
    } catch (error) {
        console.error('Error saving custom instance name:', error);
    }
}

// Rename instance action (frontend-only)
export function renameInstanceAction(instanceId: string, newInstanceName: string) {
    try {
        setInstanceCustomName(instanceId, newInstanceName.trim());
        return { success: true, data: { instanceId, newName: newInstanceName.trim() } };
    } catch (error: any) {
        console.error(`Error renaming instance ${instanceId}:`, error.message);
        return { success: false, error: 'Erro ao salvar o novo nome da instância.' };
    }
}