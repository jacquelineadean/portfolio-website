import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-share-buttons',
  standalone: true,
  templateUrl: './share-buttons.html',
  styleUrl: './share-buttons.scss',
})
export class ShareButtons {
  title = input.required<string>();
  url = input<string>();

  protected readonly copied = signal(false);

  protected get shareUrl(): string {
    return this.url() || (typeof window !== 'undefined' ? window.location.href : '');
  }

  protected shareOnTwitter(): void {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(this.title())}&url=${encodeURIComponent(this.shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  }

  protected shareOnLinkedIn(): void {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  }

  protected async copyLink(): Promise<void> {
    await navigator.clipboard.writeText(this.shareUrl);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
