import pandas as pd
from openpyxl.styles import Alignment
import json

def get_xlsx():
    with open('inp/test.json', 'r', encoding='utf-8') as file:
        data = json.load(file)

    rows = []

    rows.append([f"{data['унікальний_код_студента']}"])
    rows.append([f"{data['ПІБ']['Прізвище']} {data['ПІБ']['Імя']} {data['ПІБ']['Побатькові']}"])
    rows.append([f"{data['Факультет']}"])
    rows.append([f"{data['Ступінь_ВО']}"])
    rows.append([f"{data['Спеціальність']['код']} ({data['Спеціальність']['назва']})"])
    rows.append([f"{data['Освітня_програма']}"])
    rows.append([f"{data['Рік_вступу']}"])
    rows.append([f"{data['Рік_завершення_навчання']}"])
    rows.append([f"{data['Ідентифікатор_академічної_групи']}"])

    for course in data["Курс"]:
        rows.append(["курс", course["номер_курсу"]])
        for semester in course["семестри"]:
            rows.append(["семестр", semester["номер_семестру"]])
            for item in semester["інформація"]:
                row = [
                    item["Код"],
                    item["Інформація"]["Назва"],
                    item["Інформація"]["Кількість кредитів"],
                    item["Інформація"]["Кількість годин"],
                    item["Інформація"]["Код форми контролю"],
                    item["Інформація"]["Оцінка"],
                    item["Інформація"]["Дата підсумкового контролю"],
                    item["Інформація"]["ПІБ викладача"],
                    item["Інформація"]["посилання на скан"]
                ]
                rows.append(row)

    df = pd.DataFrame(rows)

    with pd.ExcelWriter(f"INP/{data['унікальний_код_студента']}.xlsx", engine='openpyxl') as writer:
        df.to_excel(writer, index=False, header=False, sheet_name='Schedule')

        ws = writer.sheets['Schedule']
        
        for row in range(1, 10):
            ws.merge_cells(f'A{row}:I{row}')

        for row in range(1, 10):
            cell = ws[f"A{row}"]
            cell.alignment = Alignment(horizontal='center', vertical='center')