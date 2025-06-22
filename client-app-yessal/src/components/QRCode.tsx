
import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import { mockUser } from "@/lib/mockData";

interface QRCodeProps {
  value: string;
  userId?: string;
  size?: number;
  color?: string;
  bgColor?: string;
}

const QRCode = ({ 
  value,
  userId = mockUser.id,
  size = 200, 
  color = "#00bf63", 
  bgColor = "#ffffff" 
}: QRCodeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    
    // Pour les données réelles, nous utiliserons l'ID utilisateur
    const qrValue = `YESSAL-USER-${userId}-${value}`;
    
    const qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: "svg",
      data: qrValue,
      dotsOptions: {
        color: color,
        type: "rounded"
      },
      cornersSquareOptions: {
        color: color,
        type: "extra-rounded"
      },
      cornersDotOptions: {
        color: color,
      },
      backgroundOptions: {
        color: bgColor,
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 10
      }
    });

    // Nettoyer le code QR précédent
    if (ref.current.firstChild) {
      ref.current.removeChild(ref.current.firstChild);
    }
    
    qrCode.append(ref.current);
  }, [value, userId, size, color, bgColor]);

  return <div ref={ref} className="mx-auto"></div>;
};

export default QRCode;
