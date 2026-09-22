import json, io, re
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[1]
data=json.loads((root/'public/data/catalog.json').read_text())
bad={'VITACEREBRINA® Premium 2x1','Chancapiedra BioPlus+ 500 ml 2x1','COLON Jarabe 500 ml 2x1','ROMPEQUISTES 500 ml 2x1','VITACER® 2x1','Moringa con Yacón','Batido Verde® 2x1','Colágeno Hidrolizado 2x1 · Uva','Rellenador de entradas 2x1 · Negro','Corrector para entradas 2x1 · Negro'}
items=[]
for p in data['products']:
    if p['name'] not in bad: continue
    for i,u in enumerate(p['images'][1:],1):
        items.append((p['name'],i,u))
items.append(('Chancapiedra clean duplicate',0,'https://cdn.shopify.com/s/files/1/0688/4828/7830/files/1und.webp?v=1781669709'))
thumbs=[]
for name,i,url in items:
    try:
        raw=urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=60).read()
        im=Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((260,230))
        thumbs.append((name,i,im.copy()))
    except Exception as e: print('ERR',name,i,e)
cols=4; cw=300; ch=280; rows=(len(thumbs)+cols-1)//cols
canvas=Image.new('RGB',(cols*cw,rows*ch),'white'); d=ImageDraw.Draw(canvas)
for n,(name,i,im) in enumerate(thumbs):
    x=n%cols*cw+20; y=n//cols*ch+10
    canvas.paste(im,(x+(260-im.width)//2,y)); d.text((x,y+235),f'{name[:30]} alt{i}',fill='black')
out=root/'artifacts'/'alternate-images.jpg'; canvas.save(out,quality=90)
print(out,len(thumbs))
