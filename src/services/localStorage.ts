// Local Storage Service for handling large video files
// Uses IndexedDB for storage and File System Access API when available

export interface LocalFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data: ArrayBuffer | Blob;
  projectId?: string;
  createdAt: Date;
}

export interface LocalProject {
  id: string;
  title: string;
  description?: string;
  sourceType: 'file' | 'url' | 'text';
  sourcePath?: string; // Local file ID
  sourceUrl?: string;
  sourceText?: string;
  targetPlatforms: string[];
  aiPrompt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalClip {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  duration: number;
  startTime: number;
  endTime: number;
  thumbnailData?: ArrayBuffer;
  videoData?: ArrayBuffer | string; // Allow both ArrayBuffer and base64 string
  platform: string;
  caption?: string;
  hashtags?: string[];
  transcript?: string; // Add transcript field
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

class LocalStorageService {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'ZuexisLocalDB';
  private readonly version = 1;

  async init(): Promise<void> {
    console.log('🔧 LocalStorage: Initializing IndexedDB...');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('❌ LocalStorage: Failed to open database:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ LocalStorage: Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('🔧 LocalStorage: Database upgrade needed, creating stores...');
        const db = (event.target as IDBOpenDBRequest).result;

        // Create files store
        if (!db.objectStoreNames.contains('files')) {
          console.log('📁 LocalStorage: Creating files store...');
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('projectId', 'projectId', { unique: false });
          filesStore.createIndex('name', 'name', { unique: false });
        }

        // Create projects store
        if (!db.objectStoreNames.contains('projects')) {
          console.log('📋 LocalStorage: Creating projects store...');
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectsStore.createIndex('status', 'status', { unique: false });
          projectsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create clips store
        if (!db.objectStoreNames.contains('clips')) {
          console.log('🎬 LocalStorage: Creating clips store...');
          const clipsStore = db.createObjectStore('clips', { keyPath: 'id' });
          clipsStore.createIndex('projectId', 'projectId', { unique: false });
          clipsStore.createIndex('status', 'status', { unique: false });
        }
        
        console.log('✅ LocalStorage: Database stores created successfully');
      };
    });
  }

  // File Management
  async saveFile(file: File, projectId?: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('💾 LocalStorage: Saving file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const fileId = crypto.randomUUID();
    console.log('🆔 LocalStorage: Generated file ID:', fileId);

    const arrayBuffer = await file.arrayBuffer();
    console.log('📦 LocalStorage: File converted to ArrayBuffer, size:', arrayBuffer.byteLength);

    const localFile: LocalFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      data: arrayBuffer,
      projectId,
      createdAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.put(localFile);

      request.onsuccess = () => {
        console.log('✅ LocalStorage: File saved successfully with ID:', fileId);
        resolve(fileId);
      };
      
      request.onerror = () => {
        console.error('❌ LocalStorage: Failed to save file:', request.error);
        reject(request.error);
      };
    });
  }

  async getFile(fileId: string): Promise<LocalFile | null> {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`🔍 LocalStorage: Attempting to retrieve file with ID: ${fileId}`);

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        
        console.log(`🔍 LocalStorage: Transaction created, object store: ${store.name}`);
        
        const request = store.get(fileId);
        
        request.onsuccess = () => {
          console.log(`🔍 LocalStorage: File request successful, result:`, request.result ? 'File found' : 'File not found');
          if (request.result) {
            console.log(`🔍 LocalStorage: Retrieved file: ${request.result.name} (${request.result.size} bytes)`);
          }
          resolve(request.result || null);
        };
        
        request.onerror = () => {
          console.error(`❌ LocalStorage: File request failed for ID ${fileId}:`, request.error);
          reject(new Error(`Failed to retrieve file: ${request.error?.message || 'Unknown error'}`));
        };

        // Add transaction error handling
        transaction.onerror = () => {
          console.error(`❌ LocalStorage: Transaction error for file ID ${fileId}:`, transaction.error);
          reject(new Error(`Transaction failed: ${transaction.error?.message || 'Unknown transaction error'}`));
        };

        transaction.oncomplete = () => {
          console.log(`🔍 LocalStorage: Transaction completed for file ID ${fileId}`);
        };

      } catch (error) {
        console.error(`❌ LocalStorage: Error creating transaction for file ID ${fileId}:`, error);
        reject(error);
      }
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFilesByProject(projectId: string): Promise<LocalFile[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Project Management
  async saveProject(project: Omit<LocalProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('📋 LocalStorage: Saving project:', project.title, 'Type:', project.sourceType);
    
    const projectId = crypto.randomUUID();
    console.log('🆔 LocalStorage: Generated project ID:', projectId);
    
    const now = new Date();

    const localProject: LocalProject = {
      ...project,
      id: projectId,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.put(localProject);

      request.onsuccess = () => {
        console.log('✅ LocalStorage: Project saved successfully with ID:', projectId);
        resolve(projectId);
      };
      
      request.onerror = () => {
        console.error('❌ LocalStorage: Failed to save project:', request.error);
        reject(request.error);
      };
    });
  }

  async getProject(projectId: string): Promise<LocalProject | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get(projectId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProjects(): Promise<LocalProject[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateProject(projectId: string, updates: Partial<LocalProject>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const project = await this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const updatedProject: LocalProject = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.put(updatedProject);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Delete associated files
    const files = await this.getFilesByProject(projectId);
    for (const file of files) {
      await this.deleteFile(file.id);
    }

    // Delete associated clips
    const clips = await this.getClipsByProject(projectId);
    for (const clip of clips) {
      await this.deleteClip(clip.id);
    }

    // Delete project
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.delete(projectId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Clip Management
  async saveClip(clip: Omit<LocalClip, 'id' | 'createdAt'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const clipId = crypto.randomUUID();

    const localClip: LocalClip = {
      ...clip,
      id: clipId,
      createdAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['clips'], 'readwrite');
      const store = transaction.objectStore('clips');
      const request = store.put(localClip);

      request.onsuccess = () => resolve(clipId);
      request.onerror = () => reject(request.error);
    });
  }

  async getClip(clipId: string): Promise<LocalClip | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['clips'], 'readonly');
      const store = transaction.objectStore('clips');
      const request = store.get(clipId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getClipsByProject(projectId: string): Promise<LocalClip[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['clips'], 'readonly');
      const store = transaction.objectStore('clips');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteClip(clipId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['clips'], 'readwrite');
      const store = transaction.objectStore('clips');
      const request = store.delete(clipId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Utility Methods
  async getStorageUsage(): Promise<{ used: number; available: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const files = await this.getAllFiles();
    const used = files.reduce((total, file) => total + file.size, 0);

    // Estimate available space (this is approximate)
    const available = 1024 * 1024 * 1024 * 5; // 5GB estimate

    return { used, available };
  }

  private async getAllFiles(): Promise<LocalFile[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Cleanup
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stores = ['files', 'projects', 'clips'];
    
    for (const storeName of stores) {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Create singleton instance
export const localStorageService = new LocalStorageService();

// Initialize on import
localStorageService.init().catch(console.error);
