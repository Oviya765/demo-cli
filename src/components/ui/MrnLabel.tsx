import { useEffect, useState } from 'react';
import { fetchMrnByPatientId } from '../../services/patientService';

export default function MrnLabel({ patientId }: { patientId: number }) {
  const [mrn, setMrn] = useState<string>(`MRN-${patientId}`);

  useEffect(() => {
    let mounted = true;
    fetchMrnByPatientId(patientId).then(m => {
      if (mounted && m) setMrn(m);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [patientId]);

  return <span>{mrn}</span>;
}
