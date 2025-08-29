import requests

url = "http://127.0.0.1:5000/analyze"
file_path = r"C:\Users\heerali\Documents\ZoonoticAI_Project\dataset\reports\sample_report1.pdf"

with open(file_path, "rb") as f:
    files = {"file": f}
    response = requests.post(url, files=files)

print(response.json())