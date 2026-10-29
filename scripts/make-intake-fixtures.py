from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from PIL import Image,ImageDraw,ImageFont,ImageFilter
root=Path(__file__).resolve().parent.parent/'test/fixtures/intake'
root.mkdir(parents=True,exist_ok=True)
for filename,signed,start in [('contract-unsigned',False,'2026-11-10'),('contract-signed',True,'2026-11-10'),('contract-date-conflict',True,'2027-07-01')]:
 c=canvas.Canvas(str(root/(filename+'.pdf')),pagesize=(595,842));c.setFillColor(HexColor('#1d6248'));c.rect(0,740,595,102,fill=1,stroke=0);c.setFillColor(HexColor('#ffffff'));c.setFont('Helvetica-Bold',23);c.drawString(48,787,'EMPLOYMENT CONTRACT');c.setFont('Helvetica',11);c.drawString(48,761,'TEST DOCUMENT — FICTIONAL, NOT FOR OFFICIAL USE');c.setFillColor(HexColor('#263c32'));c.setFont('Helvetica',14)
 for i,line in enumerate(['Role: Software engineer','Working location: Korea','Proposed work start: '+start,'This is an evaluation document with no real employee data.']):c.drawString(48,665-i*42,line)
 c.setFont('Helvetica-Bold',14);c.drawString(48,410,'Employee signature');c.line(48,350,350,350)
 if signed:c.setFont('Helvetica-Oblique',23);c.drawString(66,365,'Test Signer')
 c.setFont('Helvetica',10);c.drawString(48,85,'This test page is not a contract and has no legal effect.');c.save()
font='/System/Library/Fonts/Supplemental/Arial.ttf';bold='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def photo(name,status=True,expiry='2027-06-30'):
 im=Image.new('RGB',(1200,900),'#f0ede7');d=ImageDraw.Draw(im);d.rounded_rectangle((65,65,1135,835),radius=18,fill='white',outline='#ccd6cc',width=3)
 d.text((110,115),'STAY INFORMATION',font=ImageFont.truetype(bold,48),fill='#204e39');d.text((110,195),'FICTIONAL TEST SUMMARY - NOT A GOVERNMENT ID',font=ImageFont.truetype(font,24),fill='#676c64')
 lines=['Reported stay status: E-7'] if status else ['Reported stay status:']
 lines+=['Reported stay expiry: '+expiry,'Record issued: 2026-10-20','No name, ID number or address is included.']
 for i,line in enumerate(lines):d.text((110,310+i*90),line,font=ImageFont.truetype(font,36),fill='#202720')
 im.save(root/(name+'.jpg'),quality=94);return im
photo('stay-clear');photo('stay-missing-status',False)
# An intentionally illegible test capture, not an edited user document.
im=Image.new('RGB',(1200,900),'#dedbd5');d=ImageDraw.Draw(im)
for y in range(200,700,100):d.rounded_rectangle((100,y,1100,y+30),radius=15,fill='#b6b4b0')
im.filter(ImageFilter.GaussianBlur(22)).save(root/'stay-unreadable.jpg',quality=92)
print('Created 3 fictional PDFs and 3 photo fixtures; no personal data.')
im=Image.new('RGB',(1200,900),'#e9edf0');d=ImageDraw.Draw(im);d.rounded_rectangle((65,65,1135,835),radius=18,fill='white',outline='#ccd6cc',width=3)
kr='/System/Library/Fonts/AppleSDGothicNeo.ttc'
d.text((110,115),'체류 정보 확인용 자료',font=ImageFont.truetype(kr,48),fill='#204e39')
d.text((110,195),'가상 시험 자료 - 실제 신분증이 아닙니다',font=ImageFont.truetype(kr,30),fill='#676c64')
for i,line in enumerate(['체류자격: E-7','체류기간 만료일: 2027.06.30','발급일: 2026.10.20','실제 이름, 등록번호, 주소가 없는 시험 자료입니다.']):d.text((110,310+i*90),line,font=ImageFont.truetype(kr,34),fill='#202720')
im.save(root/'stay-korean.png')
