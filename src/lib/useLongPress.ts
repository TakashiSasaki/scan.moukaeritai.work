import React, { useCallback, useRef } from 'react';
import { triggerImageMetadata } from '../components/ImageMetadataDialog';

export function useLongPress(url: string | undefined | null, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback((e: React.PointerEvent) => {
    if (!url) return;
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      triggerImageMetadata(url);
    }, ms);
  }, [url, ms]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClickCapture
  };
}
