/**
 * Minimal, hand-written FHIR R4 type definitions.
 *
 * We only model the fields this app actually reads. Every resource we
 * special-case (Patient, Observation, Condition, MedicationRequest,
 * Encounter) extends {@link FhirResourceBase}. Anything we don't model
 * falls back to {@link UnknownResource}, which is permissive by design.
 */

export interface FhirResourceBase {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
  [key: string]: unknown;
}

/** Catch-all for resource types we don't explicitly model. */
export type UnknownResource = FhirResourceBase;

// --- Shared datatypes ------------------------------------------------------

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface HumanName {
  use?: string;
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface Identifier {
  use?: string;
  system?: string;
  value?: string;
}

export interface ContactPoint {
  system?: string;
  value?: string;
  use?: string;
  rank?: number;
}

export interface Address {
  use?: string;
  type?: string;
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Reference {
  reference?: string;
  display?: string;
}

export interface Quantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Period {
  start?: string;
  end?: string;
}

// --- Special-cased resources ----------------------------------------------

export interface Patient extends FhirResourceBase {
  resourceType: 'Patient';
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
  identifier?: Identifier[];
  telecom?: { system?: string; value?: string; use?: string }[];
}

/** A single band from `Observation.referenceRange`. */
export interface ObservationReferenceRange {
  low?: Quantity;
  high?: Quantity;
  type?: CodeableConcept;
  text?: string;
}

/** One measurement inside a panel (e.g. systolic within blood pressure). */
export interface ObservationComponent {
  code?: CodeableConcept;
  valueQuantity?: Quantity;
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
}

export interface Observation extends FhirResourceBase {
  resourceType: 'Observation';
  status?: string;
  code?: CodeableConcept;
  subject?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: Period;
  valueQuantity?: Quantity;
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
  referenceRange?: ObservationReferenceRange[];
  component?: ObservationComponent[];
}

export interface Condition extends FhirResourceBase {
  resourceType: 'Condition';
  clinicalStatus?: CodeableConcept;
  verificationStatus?: CodeableConcept;
  code?: CodeableConcept;
  severity?: CodeableConcept;
  subject?: Reference;
  recordedDate?: string;
  onsetDateTime?: string;
  abatementDateTime?: string;
}

/** `Dosage` — only the fields the dosage instrument reads. */
export interface Dosage {
  text?: string;
  route?: CodeableConcept;
  timing?: {
    repeat?: {
      frequency?: number;
      period?: number;
      periodUnit?: string;
    };
  };
  doseAndRate?: { doseQuantity?: Quantity }[];
}

export interface MedicationRequest extends FhirResourceBase {
  resourceType: 'MedicationRequest';
  status?: string;
  intent?: string;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: Reference;
  subject?: Reference;
  authoredOn?: string;
  dosageInstruction?: Dosage[];
}

export interface Encounter extends FhirResourceBase {
  resourceType: 'Encounter';
  status?: string;
  class?: Coding;
  type?: CodeableConcept[];
  subject?: Reference;
  period?: Period;
}

// --- Infrastructure resources ---------------------------------------------

export interface BundleLink {
  relation: string;
  url: string;
}

export interface BundleEntry<T extends FhirResourceBase = FhirResourceBase> {
  fullUrl?: string;
  resource?: T;
  search?: { mode?: string };
}

export interface Bundle<T extends FhirResourceBase = FhirResourceBase>
  extends FhirResourceBase {
  resourceType: 'Bundle';
  type?: string;
  total?: number;
  link?: BundleLink[];
  entry?: BundleEntry<T>[];
}

export interface CapabilityStatementResource {
  type: string;
  profile?: string;
  interaction?: { code: string }[];
  searchParam?: { name: string; type: string; documentation?: string }[];
}

/** A (recursively nestable) FHIR Extension — only the fields we read. */
export interface Extension {
  url: string;
  valueUri?: string;
  valueString?: string;
  extension?: Extension[];
}

export interface CapabilityStatement extends FhirResourceBase {
  resourceType: 'CapabilityStatement';
  software?: { name?: string; version?: string; releaseDate?: string };
  implementation?: { description?: string; url?: string };
  fhirVersion?: string;
  rest?: {
    mode?: string;
    security?: {
      cors?: boolean;
      service?: CodeableConcept[];
      extension?: Extension[];
    };
    resource?: CapabilityStatementResource[];
  }[];
}

export interface OperationOutcomeIssue {
  severity: 'fatal' | 'error' | 'warning' | 'information';
  code: string;
  diagnostics?: string;
  details?: CodeableConcept;
  expression?: string[];
}

export interface OperationOutcome extends FhirResourceBase {
  resourceType: 'OperationOutcome';
  issue: OperationOutcomeIssue[];
}

/** Union of the resource types we render with dedicated field pickers. */
export type KnownResource =
  | Patient
  | Observation
  | Condition
  | MedicationRequest
  | Encounter;

export type AnyResource = KnownResource | UnknownResource;
