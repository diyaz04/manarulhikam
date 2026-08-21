import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNamaLembaga(nama: string | undefined | null) {
  if (!nama) return '';
  return nama
    .replace('TK Manarul Hikam', 'TK IT Manarul Hikam')
    .replace('SMP Manarul Hikam', 'SMP IT Manarul Hikam')
    .replace('SMA Manarul Hikam', 'SMA IT Manarul Hikam');
}
