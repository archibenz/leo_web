'use client';

import {useCallback, useEffect, useRef} from 'react';
import {useEditor} from './EditorProvider';

export function useEditorFormState(dirty: boolean, busy: boolean, reset: () => void) {
  const {setFormState} = useEditor();
  const resetRef = useRef(reset);
  resetRef.current = reset;
  const resetCurrent = useCallback(() => resetRef.current(), []);

  useEffect(() => {
    setFormState({dirty, busy, reset: resetCurrent});
  }, [dirty, busy, resetCurrent, setFormState]);
  useEffect(() => () => setFormState({dirty: false, busy: false, reset: () => {}}), [setFormState]);
}
