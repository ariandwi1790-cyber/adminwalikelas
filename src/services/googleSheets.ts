export interface GoogleSheetInfo {
  sheetTitle: string;
  sheetId: number;
}

export async function fetchGoogleSpreadsheetValues(
  spreadsheetId: string,
  range: string = 'A1:Z200',
  accessToken: string
): Promise<any[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.values || [];
}

export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: GoogleSheetInfo[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal membaca metadata Spreadsheet (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const sheets: GoogleSheetInfo[] = (data.sheets || []).map((s: any) => ({
    sheetTitle: s.properties?.title || 'Sheet1',
    sheetId: s.properties?.sheetId || 0,
  }));

  return {
    title: data.properties?.title || 'Google Spreadsheet Siswa',
    sheets,
  };
}
