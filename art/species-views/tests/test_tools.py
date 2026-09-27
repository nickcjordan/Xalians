import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from PIL import Image
from common import VIEWS, binary, iou, save_mask, write_json
from split_sheet import split
from mask import derive
from register import register
from check import check
from contact import contact


class Tools(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.d=Path(self.tmp.name)

    def tearDown(self): self.tmp.cleanup()

    def fixture(self):
        a=np.full((60,60,3),255,dtype='uint8'); a[10:50,20:40]=100
        a[15:20,24:28]=255
        p=self.d/'source.png';Image.fromarray(a).save(p);return p

    def test_split_bounds_and_order(self):
        p=self.d/'sheet.png';Image.new('RGB',(60,10),'white').save(p)
        boxes={n:[i*10,0,(i+1)*10,10] for i,n in enumerate(VIEWS)}
        out=split(p,boxes,self.d/'crops')
        self.assertEqual(out['left']['angle'],90)
        boxes['back']=[0,0,10,10]
        with self.assertRaises(ValueError):split(p,boxes,self.d/'bad')
        boxes['back']=[60,0,70,10]
        with self.assertRaises(ValueError):split(p,boxes,self.d/'bad')

    def test_mask_enclosed_features_and_white_background(self):
        derive(self.fixture(),self.d/'m',surface_boxes=[(23,14,29,21)])
        self.assertTrue(binary(self.d/'m.occupancy.png')[16,25])
        self.assertFalse(binary(self.d/'m.mask.png')[16,25])
        self.assertFalse(binary(self.d/'m.occupancy.png')[0,0])

    def test_unannotated_gap_is_not_filled(self):
        derive(self.fixture(),self.d/'m')
        self.assertFalse(binary(self.d/'m.occupancy.png')[16,25])

    def test_alpha_requires_actual_transparency(self):
        with self.assertRaises(ValueError):derive(self.fixture(),self.d/'m','alpha')
        im=Image.new('RGBA',(20,20),(0,0,0,0)); im.paste((100,100,100,255),(5,5,15,15))
        im.save(self.d/'alpha.png');derive(self.d/'alpha.png',self.d/'m','alpha')
        self.assertEqual(int(binary(self.d/'m.occupancy.png').sum()),100)

    def test_registration_preserves_shape_and_rows(self):
        p=self.fixture();derive(p,self.d/'m')
        g=register(p,self.d/'m.occupancy.png',self.d/'m.mask.png',self.d/'out',100,60,80,{'eyes':17})
        self.assertAlmostEqual(g['scale'],1.5)
        self.assertAlmostEqual(g['figureHeight'],60,delta=1)
        self.assertAlmostEqual(g['groundRow'],80,delta=1)
        self.assertEqual(g['landmarks']['eyes'],17*1.5+g['translation'][1])

    def test_empty_mask_rejected(self):
        Image.new('RGB',(60,60),'white').save(self.d/'empty.png')
        with self.assertRaises(ValueError):derive(self.d/'empty.png',self.d/'m')

    def test_iou_threshold(self):
        a=np.ones((10,10),dtype=bool);b=a.copy();b.flat[:5]=False
        self.assertEqual(iou(a,b),.95)
        b.flat[5]=False;self.assertLess(iou(a,b),.95)

    def test_missing_evidence_blocks_and_contact_refuses(self):
        a=np.zeros((60,60),dtype=bool);a[10:50,20:40]=True
        save_mask(a,self.d/'ref.png')
        r=check(self.d,self.d/'ref.png',None)
        self.assertEqual(r['status'],'fail')
        with self.assertRaises(ValueError):contact(self.d,self.d/'ref.png',self.d/'contact.png')

    def test_contact_rejects_changed_image(self):
        from common import digest
        p=self.fixture()
        write_json(self.d/'report.json',{'status':'pass','inventory':{'source.png':digest(p)}})
        Image.new('RGB',(60,60),'black').save(p)
        with self.assertRaisesRegex(ValueError,'Stale'):
            contact(self.d,p,self.d/'contact.png')

    def test_source_overlap_is_diagnostic_not_acceptance(self):
        p=self.fixture();derive(p,self.d/'m')
        register(p,self.d/'m.occupancy.png',self.d/'m.mask.png',self.d/'front',60,30,50)
        reference=np.zeros((60,60),dtype=bool);reference[3:9,3:9]=True
        save_mask(reference,self.d/'ref.png')
        report=check(self.d,self.d/'ref.png',None)
        score=next(c for c in report['checks'] if c['name']=='front:occupancyIoU')
        self.assertEqual(score['status'],'pass')
        self.assertTrue(score['evidence']['diagnosticOnly'])
        self.assertEqual(score['evidence']['value'],0)


if __name__=='__main__': unittest.main()
