"""One-time public XLSX preprocessing, Python standard library only.
Usage: python3 scripts/extract-retail-data.py /path/to/online+retail.zip
The runtime application remains TypeScript. Customer/invoice fields are excluded.
"""
import sys, zipfile, xml.etree.ElementTree as E, json, datetime, hashlib
from pathlib import Path
archive = Path(sys.argv[1])
with zipfile.ZipFile(archive) as z:
    workbook = zipfile.ZipFile(z.open(z.namelist()[0]))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    strings = [''.join(x.itertext()) for x in E.parse(workbook.open('xl/sharedStrings.xml')).getroot()]
    rows = []
    for _, element in E.iterparse(workbook.open('xl/worksheets/sheet1.xml'), events=('end',)):
        if not element.tag.endswith('}row'):
            continue
        record = {}
        for cell in element:
            value = cell.find('m:v', ns)
            if value is not None:
                key = ''.join(x for x in cell.attrib['r'] if x.isalpha())
                record[key] = strings[int(value.text)] if cell.attrib.get('t') == 's' else value.text
        if element.attrib['r'] != '1' and 'B' in record and 'C' in record and record.get('D', '0').isdigit() and int(record['D']) > 0 and record.get('F'):
            rows.append({'id': 'uci-row-' + element.attrib['r'], 'sku': record['B'], 'name': record['C'], 'quantity': int(record['D']), 'unit_price_gbp': float(record['F']), 'date': (datetime.datetime(1899, 12, 30) + datetime.timedelta(days=float(record['E']))).isoformat()})
        element.clear()
        if len(rows) >= 24:
            break
out = {'id': 'retail', 'name': 'UCI Online Retail', 'url': 'https://archive.ics.uci.edu/dataset/352/online+retail', 'download_url': 'https://archive.ics.uci.edu/static/public/352/online+retail.zip', 'retrieved_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'period': '2010–2011 historical transactions', 'license': 'CC BY 4.0', 'attribution': 'Chen, D. (2015). Online Retail. UCI Machine Learning Repository. DOI:10.24432/C5BW33.', 'transformation': 'First 24 positive-quantity rows; CustomerID, InvoiceNo and Country excluded. Source row number retained. No customer identities are imported.', 'raw_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'rows': rows}
Path('data/public/retail.json').write_text(json.dumps(out, indent=2) + '\n')
print('Extracted', len(rows), 'public historical transaction rows without customer/invoice identifiers.')
