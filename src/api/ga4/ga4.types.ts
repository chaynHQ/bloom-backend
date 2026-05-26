interface Ga4Dimension {
  name: string;
}

interface Ga4Metric {
  name: string;
}

interface Ga4DateRange {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;
}

interface Ga4OrderBy {
  metric?: { metricName: string };
  desc?: boolean;
}

interface Ga4DimensionFilter {
  fieldName: string;
  inListFilter?: { values: string[] };
  stringFilter?: { value: string; matchType?: string };
}

interface Ga4FilterExpression {
  filter?: Ga4DimensionFilter;
  andGroup?: { expressions: Ga4FilterExpression[] };
  orGroup?: { expressions: Ga4FilterExpression[] };
}

export interface Ga4RunReportRequest {
  dimensions?: Ga4Dimension[];
  metrics: Ga4Metric[];
  dateRanges: Ga4DateRange[];
  orderBys?: Ga4OrderBy[];
  limit?: string | number;
  dimensionFilter?: Ga4FilterExpression;
}

interface Ga4ReportRow {
  dimensionValues?: Array<{ value: string }>;
  metricValues?: Array<{ value: string }>;
}

export interface Ga4RunReportResponse {
  rows?: Ga4ReportRow[];
  rowCount?: number;
}
