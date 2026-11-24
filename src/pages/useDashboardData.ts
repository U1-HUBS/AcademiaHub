import { useEffect, useState } from 'react';

type Result<T> = { status: 'ready'; data: T } | { status: 'failed' };

export function useDashboardData<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ load: () => Promise<T>; attempt: number; result: Result<T> }>();

  useEffect(() => {
    let active = true;
    const finish = (result: Result<T>) => {
      if (active) setSettled({ load, attempt, result });
    };

    void load().then(
      data => finish({ status: 'ready', data }),
      () => finish({ status: 'failed' }),
    );

    return () => { active = false; };
  }, [load, attempt]);

  const result = settled?.load === load && settled.attempt === attempt ? settled.result : undefined;

  return {
    data: result?.status === 'ready' ? result.data : undefined,
    loading: !result,
    failed: result?.status === 'failed',
    retry: () => setAttempt(previous => previous + 1),
  };
}
