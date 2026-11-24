"""Audit pixel helpers. Coordinates are in design points (375-wide grid).
pair <hifi.png> <build.png> <out.png>        side-by-side at 2x (750px each) with a 10pt grid ruler
ink <img.png> x y w h                         background + text/icon colour in a box (light or dark UI)
px <img.png> x y                              colour at a point
rows <img.png> x y w h                        y ranges (pt) of rows containing ink, to measure line height
box <img.png> x y w h #RRGGBB [tol]          bounds (pt) of pixels of that colour in a region: button, chip, card sizes
"""
import sys
from collections import Counter
from PIL import Image, ImageDraw
def load(p):
    im=Image.open(p).convert('RGB'); s=im.width/375.0; return im,s
def hexc(c): return '#%02X%02X%02X'%c[:3]
cmd=sys.argv[1]
if cmd=='pair':
    a,_=load(sys.argv[2]); b,_=load(sys.argv[3])
    H=int(812*2)
    a=a.resize((750,int(a.height*750/a.width))); b=b.resize((750,int(b.height*750/b.width)))
    h=max(a.height,b.height); out=Image.new('RGB',(1540,h),'white')
    out.paste(a,(0,0)); out.paste(b,(790,0))
    d=ImageDraw.Draw(out)
    for y in range(0,h,100):
        d.line([(750,y),(790,y)],fill=(255,0,0)); d.text((752,y+2),str(y//2),fill=(255,0,0))
    out.save(sys.argv[4])
elif cmd=='ink':
    # works on light and dark backgrounds: ink = the colour furthest from the background
    im,s=load(sys.argv[2]); x,y,w,h=map(float,sys.argv[3:7])
    box=im.crop((int(x*s),int(y*s),int((x+w)*s),int((y+h)*s)))
    px=list(box.getdata()); bg=Counter(px).most_common(1)[0][0]
    dist=lambda c:sum(abs(a-b) for a,b in zip(c,bg))
    far=max(px,key=dist)
    near=[c for c in px if dist(c)>=dist(far)-30]
    print('bg',hexc(bg),'extreme',hexc(far),'ink',hexc(Counter(near).most_common(1)[0][0]))
elif cmd=='box':
    im,s=load(sys.argv[2]); x,y,w,h=map(float,sys.argv[3:7]); t=sys.argv[7].lstrip('#'); tol=int(sys.argv[8]) if len(sys.argv)>8 else 12
    tc=tuple(int(t[i:i+2],16) for i in (0,2,4)); ox,oy=int(x*s),int(y*s)
    box=im.crop((ox,oy,int((x+w)*s),int((y+h)*s))); W,H=box.size; pxs=box.load()
    hit=[(i,j) for j in range(H) for i in range(W) if all(abs(a-b)<=tol for a,b in zip(pxs[i,j],tc))]
    if not hit: print('no pixels of',sys.argv[7]); sys.exit()
    xs=[i for i,_ in hit]; ys=[j for _,j in hit]
    x0,x1,y0,y1=(min(xs)+ox)/s,(max(xs)+1+ox)/s,(min(ys)+oy)/s,(max(ys)+1+oy)/s
    print(f'x {x0:.1f} y {y0:.1f} w {x1-x0:.1f} h {y1-y0:.1f}')
elif cmd=='px':
    im,s=load(sys.argv[2]); x,y=map(float,sys.argv[3:5]); print(hexc(im.getpixel((int(x*s),int(y*s)))))
elif cmd=='rows':
    im,s=load(sys.argv[2]); x,y,w,h=map(float,sys.argv[3:7])
    box=im.crop((int(x*s),int(y*s),int((x+w)*s),int((y+h)*s))).convert('L')
    bgv=Counter(box.getdata()).most_common(1)[0][0]
    ink=[any(abs(box.getpixel((i,j))-bgv)>60 for i in range(box.width)) for j in range(box.height)]
    runs=[];st=None
    for j,v in enumerate(ink+[False]):
        if v and st is None: st=j
        if not v and st is not None: runs.append((st,j)); st=None
    for a,b in runs: print('rows %.1f-%.1f pt (h %.1f)'%(y+a/s,y+b/s,(b-a)/s))
    if len(runs)>1:
        tops=[y+a/s for a,_ in runs]; print('pitch', ['%.1f'%(tops[i+1]-tops[i]) for i in range(len(tops)-1)])
