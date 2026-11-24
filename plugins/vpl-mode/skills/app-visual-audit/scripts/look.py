"""Preview captures for Claude to read: each image scaled to 375 wide, side by side.
usage: python3 look.py <out.png> <img1.png> [img2.png ...]"""
import sys
from PIL import Image
ims=[Image.open(p).convert('RGB') for p in sys.argv[2:]]
ims=[i.resize((375, round(i.height*375/i.width))) for i in ims]
W=sum(i.width for i in ims)+10*(len(ims)-1); H=max(i.height for i in ims)
o=Image.new('RGB',(W,H),'white'); x=0
for i in ims: o.paste(i,(x,0)); x+=i.width+10
o.save(sys.argv[1])
