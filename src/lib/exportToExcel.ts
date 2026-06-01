export interface ExportColumn<T> {
  header: string
  accessor: (row: T) => string | number
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
) {
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = col.accessor(row)
      if (typeof val === 'number') return val.toLocaleString('en-US', { minimumFractionDigits: 2 })
      return String(val)
    })
  )

  const tableRows = [columns.map((c) => c.header), ...rows]
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')

  const html = `<table>${tableRows}</table>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xls`
  a.click()
  URL.revokeObjectURL(url)
}
