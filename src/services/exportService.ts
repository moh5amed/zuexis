// Export Service for downloading clips, captions, and project data
// Handles local file generation and downloads

import { LocalProject, LocalClip } from './localStorage';

export interface ExportOptions {
  format: 'json' | 'txt' | 'csv';
  includeMetadata: boolean;
  includeCaptions: boolean;
  includeHashtags: boolean;
}

export interface ExportData {
  project: LocalProject;
  clips: LocalClip[];
  exportDate: string;
  totalClips: number;
  totalDuration: number;
}

class ExportService {
  // Export project data as JSON
  async exportProjectData(project: LocalProject, clips: LocalClip[], options: ExportOptions): Promise<void> {
    try {
      const exportData: ExportData = {
        project,
        clips,
        exportDate: new Date().toISOString(),
        totalClips: clips.length,
        totalDuration: clips.reduce((total, clip) => total + clip.duration, 0)
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      this.downloadFile(blob, `project-${project.title}-${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('Error exporting project data:', error);
      throw new Error('Failed to export project data');
    }
  }

  // Export captions for multiple platforms
  async exportCaptions(
    project: LocalProject, 
    clips: LocalClip[], 
    platform: string,
    options: ExportOptions
  ): Promise<void> {
    try {
      let content = '';
      
      if (options.format === 'txt') {
        content = this.generateTextCaptions(project, clips, platform, options);
      } else if (options.format === 'csv') {
        content = this.generateCSVCaptions(project, clips, platform, options);
      } else {
        content = this.generateJSONCaptions(project, clips, platform, options);
      }

      const blob = new Blob([content], { 
        type: this.getMimeType(options.format) 
      });
      
      this.downloadFile(blob, `captions-${project.title}-${platform}-${new Date().toISOString().split('T')[0]}.${options.format}`);
    } catch (error) {
      console.error('Error exporting captions:', error);
      throw new Error('Failed to export captions');
    }
  }

  // Export all captions for all platforms
  async exportAllCaptions(project: LocalProject, clips: LocalClip[], options: ExportOptions): Promise<void> {
    try {
      const platforms = ['tiktok', 'instagram', 'youtube', 'twitter', 'linkedin'];
      
      for (const platform of platforms) {
        await this.exportCaptions(project, clips, platform, options);
        // Small delay to prevent browser from blocking multiple downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error exporting all captions:', error);
      throw new Error('Failed to export all captions');
    }
  }

  // Generate text format captions
  private generateTextCaptions(
    project: LocalProject, 
    clips: LocalClip[], 
    platform: string,
    options: ExportOptions
  ): string {
    let content = `CAPTIONS FOR: ${project.title}\n`;
    content += `PLATFORM: ${platform.toUpperCase()}\n`;
    content += `EXPORT DATE: ${new Date().toLocaleDateString()}\n`;
    content += `TOTAL CLIPS: ${clips.length}\n\n`;
    content += '='.repeat(50) + '\n\n';

    clips.forEach((clip, index) => {
      content += `CLIP ${index + 1}: ${clip.title}\n`;
      content += `DURATION: ${Math.floor(clip.duration)}s\n`;
      content += `TIMESTAMP: ${Math.floor(clip.startTime / 60)}:${(clip.startTime % 60).toString().padStart(2, '0')}\n\n`;
      
      if (clip.caption) {
        content += `CAPTION:\n${clip.caption}\n\n`;
      }
      
      if (clip.hashtags && clip.hashtags.length > 0) {
        content += `HASHTAGS:\n${clip.hashtags.map(tag => `#${tag}`).join(' ')}\n\n`;
      }
      
      content += '-'.repeat(30) + '\n\n';
    });

    return content;
  }

  // Generate CSV format captions
  private generateCSVCaptions(
    project: LocalProject, 
    clips: LocalClip[], 
    platform: string,
    options: ExportOptions
  ): string {
    let content = 'Clip Title,Duration (s),Start Time,End Time,Caption,Hashtags\n';
    
    clips.forEach(clip => {
      const title = `"${clip.title.replace(/"/g, '""')}"`;
      const duration = Math.floor(clip.duration);
      const startTime = Math.floor(clip.startTime / 60) + ':' + (clip.startTime % 60).toString().padStart(2, '0');
      const endTime = Math.floor(clip.endTime / 60) + ':' + (clip.endTime % 60).toString().padStart(2, '0');
      const caption = clip.caption ? `"${clip.caption.replace(/"/g, '""')}"` : '';
      const hashtags = clip.hashtags ? clip.hashtags.map(tag => `#${tag}`).join(' ') : '';
      
      content += `${title},${duration},${startTime},${endTime},${caption},"${hashtags}"\n`;
    });

    return content;
  }

  // Generate JSON format captions
  private generateJSONCaptions(
    project: LocalProject, 
    clips: LocalClip[], 
    platform: string,
    options: ExportOptions
  ): string {
    const exportData = {
      project: {
        title: project.title,
        description: project.description,
        sourceType: project.sourceType,
        targetPlatforms: project.targetPlatforms
      },
      platform,
      exportDate: new Date().toISOString(),
      clips: clips.map(clip => ({
        title: clip.title,
        description: clip.description,
        duration: clip.duration,
        startTime: clip.startTime,
        endTime: clip.endTime,
        caption: clip.caption,
        hashtags: clip.hashtags,
        platform: clip.platform
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Export clip data as a summary report
  async exportClipReport(project: LocalProject, clips: LocalClip[]): Promise<void> {
    try {
      const report = this.generateClipReport(project, clips);
      const blob = new Blob([report], { type: 'text/plain' });
      
      this.downloadFile(blob, `clip-report-${project.title}-${new Date().toISOString().split('T')[0]}.txt`);
    } catch (error) {
      console.error('Error exporting clip report:', error);
      throw new Error('Failed to export clip report');
    }
  }

  // Generate clip summary report
  private generateClipReport(project: LocalProject, clips: LocalClip[]): string {
    let report = `CLIP REPORT\n`;
    report += `===========\n\n`;
    report += `PROJECT: ${project.title}\n`;
    report += `DESCRIPTION: ${project.description || 'No description'}\n`;
    report += `SOURCE TYPE: ${project.sourceType}\n`;
    report += `TARGET PLATFORMS: ${project.targetPlatforms.join(', ')}\n`;
    report += `EXPORT DATE: ${new Date().toLocaleDateString()}\n`;
    report += `TOTAL CLIPS: ${clips.length}\n\n`;

    // Calculate statistics
    const totalDuration = clips.reduce((total, clip) => total + clip.duration, 0);
    const avgDuration = clips.length > 0 ? totalDuration / clips.length : 0;
    const platformBreakdown = clips.reduce((acc, clip) => {
      acc[clip.platform] = (acc[clip.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    report += `STATISTICS:\n`;
    report += `- Total Duration: ${Math.floor(totalDuration / 60)}:${(totalDuration % 60).toString().padStart(2, '0')}\n`;
    report += `- Average Clip Duration: ${Math.floor(avgDuration)}s\n`;
    report += `- Platform Breakdown:\n`;
    
    Object.entries(platformBreakdown).forEach(([platform, count]) => {
      report += `  * ${platform}: ${count} clips\n`;
    });

    report += `\nCLIP DETAILS:\n`;
    report += `=============\n\n`;

    clips.forEach((clip, index) => {
      report += `${index + 1}. ${clip.title}\n`;
      report += `   Duration: ${Math.floor(clip.duration)}s\n`;
      report += `   Time Range: ${Math.floor(clip.startTime / 60)}:${(clip.startTime % 60).toString().padStart(2, '0')} - ${Math.floor(clip.endTime / 60)}:${(clip.endTime % 60).toString().padStart(2, '0')}\n`;
      report += `   Platform: ${clip.platform}\n`;
      
      if (clip.description) {
        report += `   Description: ${clip.description}\n`;
      }
      
      if (clip.caption) {
        report += `   Caption: ${clip.caption}\n`;
      }
      
      if (clip.hashtags && clip.hashtags.length > 0) {
        report += `   Hashtags: ${clip.hashtags.map(tag => `#${tag}`).join(' ')}\n`;
      }
      
      report += `\n`;
    });

    return report;
  }

  // Get MIME type for export format
  private getMimeType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'txt':
      default:
        return 'text/plain';
    }
  }

  // Download file to user's device
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export project as a complete package (ZIP-like structure)
  async exportProjectPackage(project: LocalProject, clips: LocalClip[]): Promise<void> {
    try {
      // Create a comprehensive export with all data
      const packageData = {
        project: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString()
        },
        clips: clips.map(clip => ({
          ...clip,
          createdAt: clip.createdAt.toISOString()
        })),
        exportInfo: {
          exportedAt: new Date().toISOString(),
          totalClips: clips.length,
          totalDuration: clips.reduce((total, clip) => total + clip.duration, 0),
          platforms: [...new Set(clips.map(clip => clip.platform))]
        }
      };

      const blob = new Blob([JSON.stringify(packageData, null, 2)], { 
        type: 'application/json' 
      });
      
      this.downloadFile(blob, `zuexis-project-${project.title}-${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('Error exporting project package:', error);
      throw new Error('Failed to export project package');
    }
  }
}

// Create singleton instance
export const exportService = new ExportService();
