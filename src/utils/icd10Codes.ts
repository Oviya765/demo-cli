export const ICD10_CODES: { code: string; description: string }[] = [
  { code: 'A09', description: 'Infectious gastroenteritis and colitis' },
  { code: 'B34.9', description: 'Viral infection, unspecified' },
  { code: 'D50.9', description: 'Iron deficiency anemia, unspecified' },
  { code: 'E11', description: 'Type 2 Diabetes Mellitus' },
  { code: 'E11.65', description: 'Type 2 Diabetes with hyperglycemia' },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode' },
  { code: 'F41.1', description: 'Generalized anxiety disorder' },
  { code: 'G43.9', description: 'Migraine, unspecified' },
  { code: 'G47.0', description: 'Insomnia' },
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'I25.10', description: 'Coronary artery disease' },
  { code: 'I48.91', description: 'Atrial fibrillation, unspecified' },
  { code: 'I50.9', description: 'Heart failure, unspecified' },
  { code: 'J02.9', description: 'Acute pharyngitis (Sore throat)' },
  { code: 'J06.9', description: 'Acute upper respiratory infection' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
  { code: 'J20.9', description: 'Acute bronchitis, unspecified' },
  { code: 'J30.1', description: 'Allergic rhinitis due to pollen' },
  { code: 'J44.1', description: 'COPD with acute exacerbation' },
  { code: 'J45.20', description: 'Mild intermittent asthma' },
  { code: 'K21.0', description: 'GERD with esophagitis' },
  { code: 'K29.70', description: 'Gastritis, unspecified' },
  { code: 'K59.00', description: 'Constipation, unspecified' },
  { code: 'K80.20', description: 'Gallstone without obstruction' },
  { code: 'L30.9', description: 'Dermatitis, unspecified' },
  { code: 'M25.50', description: 'Joint pain, unspecified' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'M79.3', description: 'Panniculitis (soft tissue disorder)' },
  { code: 'N39.0', description: 'Urinary tract infection' },
  { code: 'R05', description: 'Cough' },
  { code: 'R06.02', description: 'Shortness of breath' },
  { code: 'R10.9', description: 'Abdominal pain, unspecified' },
  { code: 'R11.2', description: 'Nausea with vomiting' },
  { code: 'R42', description: 'Dizziness and giddiness' },
  { code: 'R50.9', description: 'Fever, unspecified' },
  { code: 'R51', description: 'Headache' },
  { code: 'R53.83', description: 'Fatigue' },
  { code: 'R73.03', description: 'Prediabetes' },
  { code: 'Z00.00', description: 'General adult medical examination' },
];

export const ICD10_REGEX = /^[A-Z]\d{2}(\.\w{1,4})?$/i;

export const validateDiagnosisInput = (value: string): boolean => {
  const parts = value.split(' - ');
  if (parts.length >= 2) return ICD10_REGEX.test(parts[0].trim());
  return ICD10_REGEX.test(value.trim());
};
