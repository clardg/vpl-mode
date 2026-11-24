"""Print the signing certificate SHA-1 and SHA-256 of an APK (v2/v3 signed; keytool can't read these).
Devs register the SHA-1 in Firebase / Google Cloud so Google sign-in works on that build.
Usage: python3 -I apk_cert.py <app.apk>"""
import sys, struct, hashlib
d = open(sys.argv[1], 'rb').read()
eocd = d.rfind(b'PK\x05\x06'); cd = struct.unpack('<I', d[eocd+16:eocd+20])[0]
if d[cd-16:cd] != b'APK Sig Block 42': sys.exit('no v2/v3 signing block (try: keytool -printcert -jarfile <apk>)')
size = struct.unpack('<Q', d[cd-24:cd-16])[0]; p, end = cd-size, cd-24
def lp(b, o): n = struct.unpack('<I', b[o:o+4])[0]; return b[o+4:o+4+n], o+4+n
while p < end:
    n, i = struct.unpack('<QI', d[p:p+12]); v = d[p+12:p+8+n]; p += 8+n
    if i in (0x7109871a, 0xf05368c0):
        signer, _ = lp(lp(v, 0)[0], 0); sd, _ = lp(signer, 0)
        _, o = lp(sd, 0); certs, _ = lp(sd, o); c, _ = lp(certs, 0)
        for name, h in (('SHA-1  ', hashlib.sha1), ('SHA-256', hashlib.sha256)):
            print(name, ':'.join(f'{x:02X}' for x in h(c).digest()))
        break
