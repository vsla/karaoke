// QR Code via Google Charts API — zero dependências
export default function QRCode({ url, size = 200, className = "" }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=0a0a0f&color=22d3ee&format=png&margin=8`;

  return (
    <img
      src={src}
      alt="QR Code para entrar na festa"
      width={size}
      height={size}
      className={`rounded-2xl border-2 border-neon-cyan/30 shadow-[0_0_30px_rgba(34,211,238,0.2)] ${className}`}
    />
  );
}
