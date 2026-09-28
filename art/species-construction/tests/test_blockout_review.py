import sys
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parents[1]))
from review_blockout import PRINCIPAL, check_cameras, occupancy


class BlockoutReviewTests(unittest.TestCase):
    def cameras(self):
        return [{'name': n, 'angle': a, 'projection': 'orthographic', 'elevationOffset': 0,
                 'orthoScale': 7.1, 'resolution': [768,768],
                 'matrixWorld': [[1,0,0,0],[0,1,0,0],[0,0,1,3.05],[0,0,0,1]]}
                for n,a in PRINCIPAL.items()]

    def test_rejects_camera_convention_and_registration_drift(self):
        check_cameras(self.cameras())
        for field,value in [('angle',270),('projection','perspective'),('elevationOffset',2),
                            ('orthoScale',8),('resolution',[512,512])]:
            cameras = self.cameras()
            cameras[2][field] = value
            with self.assertRaises(ValueError):
                check_cameras(cameras)
        cameras=self.cameras()
        cameras[2]['matrixWorld'][2][3]=4
        with self.assertRaises(ValueError):
            check_cameras(cameras)

    def test_missing_or_duplicate_principal_view(self):
        for cameras in [self.cameras()[:-1], self.cameras()+[self.cameras()[0]]]:
            with self.assertRaises(ValueError):
                check_cameras(cameras)

    def test_occupancy_uses_alpha_and_rejects_clipping(self):
        image=Image.new('RGBA',(20,20),(255,255,255,0))
        with self.assertRaises(ValueError):
            occupancy(image)
        ImageDraw.Draw(image).rectangle((5,4,14,17),fill=(255,255,255,255))
        mask,box=occupancy(image)
        self.assertEqual(box,(5,4,15,18))
        self.assertEqual(mask.getpixel((8,8)),0)
        self.assertEqual(mask.getpixel((0,0)),255)
        image.putpixel((0,8),(0,0,0,255))
        with self.assertRaises(ValueError):
            occupancy(image)
