/** Objetos do bucket tocados por uma atualização: o que subiu e o que ficou sem dono. */
export class MediaChangeLog {
  readonly uploadedUrls: string[] = [];
  readonly obsoleteUrls: string[] = [];

  recordUpload(url: string): void {
    this.uploadedUrls.push(url);
  }

  recordObsolete(url: string | undefined | null): void {
    if (url && !this.obsoleteUrls.includes(url)) this.obsoleteUrls.push(url);
  }
}
