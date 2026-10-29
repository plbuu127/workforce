from pathlib import Path
import json,subprocess
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent.parent/'test/fixtures/preparation';root.mkdir(exist_ok=True,parents=True)
font='/System/Library/Fonts/Supplemental/Arial.ttf';bold='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def pdf(name,kind,start='2026-11-10',signed=True,employer='Harbor Labs',job='Software engineer',multi=False,alternate=False):
 p=root/(name+'.pdf'); c=canvas.Canvas(str(p),pagesize=(595,842))
 def header(title):
  c.setFillColor(HexColor('#183f35'));c.rect(0,745,595,97,fill=1,stroke=0);c.setFillColor(HexColor('#ffffff'));c.setFont('Helvetica-Bold',20);c.drawString(42,790,title);c.setFont('Helvetica',9);c.drawString(42,766,'SYNTHETIC QA DOCUMENT - NO LEGAL EFFECT')
  c.setFillColor(HexColor('#203b33'));c.setFont('Helvetica',11)
 def lines(items,y=695):
  for x in items:c.drawString(42,y,x);y-=29
  return y
 header('EMPLOYMENT AGREEMENT' if kind=='contract' else 'COMPANY JOINING DETAILS')
 if alternate:
  lines(['Internal reference: QA-HOLDOUT','Prepared: October 28, 2026','Position: '+job,'Employer organization: '+employer,'Employment commencement: '+start])
 else:lines(['Employer: '+employer,'Job title: '+job,'Work location: Seoul, Korea','Document issue date: 2026-10-28'])
 if multi:
  lines(['1. Role and responsibilities','Build and maintain internal software services.','2. Work arrangement','Full-time role. The parties will review the detailed policies.','The start and signatures are on page 2.'],y=530)
  c.setFont('Helvetica',9);c.drawString(42,40,'Page 1 of 2 - Fictional evaluation material');c.showPage();header('AGREEMENT - START AND SIGNATURE')
 if not alternate:lines(['Proposed employment start: '+start,'Contract end: 2027-12-31','This page is a test artifact; it creates no employment agreement.'],y=660 if multi else 530)
 if kind=='contract':
  c.setFont('Helvetica-Bold',12);c.drawString(42,325,'Employee signature');c.line(42,270,315,270)
  if signed:c.setFont('Helvetica-Oblique',20);c.drawString(54,282,'QA Test Signer')
 else:lines(['Prepared by the company for document comparison.','This is not a government form or evidence of work permission.'],y=390)
 c.setFont('Helvetica',9);c.drawString(42,40,'Fictional evaluation material - no personal identifiers');c.save()
 subprocess.run(['pdftoppm','-jpeg','-r','110',str(p),str(root/name)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 return sorted(x.name for x in root.glob(name+'-*.jpg'))
def image_doc(name,lines,ko=False,unreadable=False):
 im=Image.new('RGB',(1100,900),'#eeeae3');d=ImageDraw.Draw(im);d.rounded_rectangle((55,55,1045,845),radius=15,fill='white',outline='#becac2',width=2)
 regular='/System/Library/Fonts/AppleSDGothicNeo.ttc' if ko else font
 d.text((95,95),'STAY INFORMATION' if name.startswith('stay') else 'COMPANY JOINING DETAILS',font=ImageFont.truetype(bold,32),fill='#244e3b')
 d.text((95,160),'SYNTHETIC QA - NOT A GOVERNMENT ID',font=ImageFont.truetype(font,22),fill='#65776e')
 for n,line in enumerate(lines):
  if unreadable:
   d.rectangle((95,250+n*100,965,290+n*100),fill='#b6b6b2')
  else:d.text((95,250+n*100),line,font=ImageFont.truetype(regular,29),fill='#18352c')
 im.save(root/(name+'.jpg'),quality=93);return [name+'.jpg']
files={}
files['unsigned']=pdf('contract-unsigned-realistic','contract',signed=False)
files['signed']=pdf('contract-signed-realistic','contract')
files['fixed']=pdf('contract-corrected-realistic','contract')
files['offer_old']=pdf('company-offer-initial','offer',start='2026-11-01')
files['offer_fixed']=pdf('company-offer-corrected','offer')
files['multi']=pdf('contract-two-pages','contract',multi=True)
files['hold_contract']=pdf('holdout-contract','contract',start='November 18, 2026',employer='Cedar Systems',job='Data engineer',alternate=True)
files['hold_offer']=pdf('holdout-company','offer',start='18 November 2026',employer='Cedar Systems',job='Data engineer',alternate=True)
files['stay_short']=image_doc('stay-expiring',['Reported stay status: E-7-1','Reported stay expiry: 2026-11-05','Record issued: 2026-10-20','No personal identifiers included.'])
files['stay_clear']=image_doc('stay-current',['Reported stay status: E-7-1','Reported stay expiry: 2027-06-30','Record issued: 2026-10-20','No personal identifiers included.'])
files['stay_ko']=image_doc('stay-korean',['체류자격: E-7-1','체류기간 만료일: 2027.06.30','발급일: 2026.10.20','실제 신분증이 아닌 가상 평가 자료입니다.'],True)
files['stay_blur']=image_doc('stay-unreadable',['status','expiry','issued','test'],unreadable=True)
files['offer_employer']=image_doc('company-name-mismatch',['Employer: Cedar Systems','Job title: Software engineer','Proposed employment start: 2026-11-10'])
files['offer_role']=image_doc('company-role-mismatch',['Employer: Harbor Labs','Job title: English teacher','Proposed employment start: 2026-11-10'])
profile={'location':'korea','goal':'change_employer','reported_status':'E-7-1','new_job_title':'Software engineer','job_changed':'no'}
def case(id,c='signed',stay='stay_clear',offer='offer_fixed',issues=[],split='development',start='2026-11-10',expiry='2027-06-30'):
 docs=[]
 for category,key in [('contract',c),('stay',stay),('offer',offer)]:
  if key:docs.append({'id':category,'category':category,'files':files[key]})
 return {'id':id,'split':split,'profile':profile,'documents':docs,'expected':{'fields':{'status':'E-7-1' if stay and stay!='stay_blur' else '', 'stay_expiry':expiry if stay and stay!='stay_blur' else '', 'contract_start':start},'issues':issues}}
cases=[case('01-clean'),case('02-three-problems',c='unsigned',stay='stay_short',offer='offer_old',issues=['contract-signature','date-conflict','expiry-reminder','documents-start'],expiry='2026-11-05'),case('03-signature-only-fixed',stay='stay_short',offer='offer_old',issues=['date-conflict','expiry-reminder','documents-start'],expiry='2026-11-05'),case('04-all-document-fixes'),case('05-unreadable-stay',stay='stay_blur',issues=['quality','field-status','field-stay_expiry']),case('06-missing-stay',stay=None,issues=['document-stay','field-status','field-stay_expiry']),case('07-missing-company',offer=None,issues=['document-offer']),case('08-korean-stay',stay='stay_ko'),case('09-multiple-pages',c='multi'),case('10-employer-mismatch',offer='offer_employer',issues=['documents-employer']),case('11-role-mismatch',offer='offer_role',issues=['documents-job_title'],split='holdout'),case('12-alternate-layout',c='hold_contract',offer='hold_offer',split='holdout',start='2026-11-18')]
(root/'cases.json').write_text(json.dumps({'synthetic':True,'reference_date':'2026-10-28','cases':cases},indent=2)+'\n')
thumbs=[]
for name in ['contract-unsigned-realistic-1.jpg','company-offer-initial-1.jpg','contract-two-pages-1.jpg','contract-two-pages-2.jpg','stay-korean.jpg','holdout-contract-1.jpg']:
 im=Image.open(root/name);im.thumbnail((360,510));thumbs.append(im)
board=Image.new('RGB',(1080,1020),'white')
for i,im in enumerate(thumbs):board.paste(im,((i%3)*360,(i//3)*510))
board.save(root/'visual-check.jpg')
print('Created 8 synthetic PDFs, rendered pages and 12 evaluation packets (10 development / 2 holdout).')
