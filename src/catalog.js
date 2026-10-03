export const categories = {
 documents: { label: 'Documents', description: 'Give your words a new format.', inputs: ['pdf','docx','txt','md'], outputs: ['pdf','docx','txt'], limit: 20 },
 images: { label: 'Images', description: 'A fresh format for every picture.', inputs: ['jpg','jpeg','png','webp','bmp'], outputs: ['png','jpg','webp','pdf'], limit: 30 },
 audio: { label: 'Audio', description: 'Keep the sound. Change the format.', inputs: ['mp3','wav','flac','aac','m4a','ogg','opus','aiff','aif','wma'], outputs: ['mp3','wav','flac','ogg','m4a','mp4','mov'], limit: 100 },
 video: { label: 'Video', description: 'New containers. Same great moments.', inputs: ['mp4','mov','webm','mkv','avi','m4v','mpeg','mpg'], outputs: ['mp4','mov','webm','mp3','wav'], limit: 100 },
};
export const formatNames={pdf:'PDF document',docx:'Word document',txt:'Plain text',png:'PNG image',jpg:'JPEG image',webp:'WebP image',mp3:'MP3 audio',wav:'WAV audio',flac:'FLAC audio',ogg:'Ogg audio',m4a:'M4A audio',mp4:'MP4 video',mov:'QuickTime video',webm:'WebM video'};
export const mimeTypes={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain;charset=utf-8',png:'image/png',jpg:'image/jpeg',webp:'image/webp',mp3:'audio/mpeg',wav:'audio/wav',flac:'audio/flac',ogg:'audio/ogg',m4a:'audio/mp4',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
export const extension=file=>file.name.split('.').pop().toLowerCase();
export const bytes=n=>n<1000?`${n} B`:n<1000**2?`${(n/1000).toFixed(1)} KB`:`${(n/1000**2).toFixed(1)} MB`;
