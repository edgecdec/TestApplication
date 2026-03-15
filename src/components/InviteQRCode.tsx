"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  url: string;
  groupName: string;
}

export default function InviteQRCode({ url, groupName }: Props) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 256, margin: 2 });
    }
  }, [open, url]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition"
        title="Show QR code for invite link"
      >
        📱 QR Code
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm mx-4 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Join {groupName}</h3>
            <p className="text-sm text-gray-500 mb-4">Scan to join this group</p>
            <canvas ref={canvasRef} className="mx-auto mb-4" />
            <p className="text-xs text-gray-400 break-all mb-4">{url}</p>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
