/** Lê uma imagem e devolve um JPEG quadrado em data URL (mantém o armazenamento leve). */
export function resizeImage(file: File, size = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Imagem inválida.'));
      image.onload = () => {
        const scale = Math.max(size / image.width, size / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Seu navegador não conseguiu processar a imagem.'));
        context.drawImage(image, (size - image.width * scale) / 2, (size - image.height * scale) / 2, image.width * scale, image.height * scale);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
