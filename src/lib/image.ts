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

/** Reduz a imagem mantendo a proporção (lado maior ≤ max) e devolve um JPEG em data URL. */
export function fitImage(file: File, max = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida.')); };
    image.onload = () => {
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      URL.revokeObjectURL(url);
      if (!context) return reject(new Error('Seu navegador não conseguiu processar a imagem.'));
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.src = url;
  });
}
