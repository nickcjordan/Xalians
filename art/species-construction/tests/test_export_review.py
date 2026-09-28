import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from review_export import check_arrays


class GeometryExportTests(unittest.TestCase):
    def arrays(self):
        ids=np.zeros((5,5),dtype=np.uint16);ids[1:4,1:4]=1
        depth=np.full((5,5),np.nan,dtype=np.float32);depth[ids>0]=8
        normals=np.full((5,5,3),np.nan,dtype=np.float32);normals[ids>0]=[0,0,1]
        features=np.zeros((5,5),dtype=np.uint8);features[2,2]=1
        return depth,normals,ids,features

    def test_actual_coverage_and_feature_subset(self):
        arrays=self.arrays()
        self.assertEqual(int(check_arrays(*arrays,{1}).sum()),9)

    def test_unknown_id_and_unmasked_depth_rejected(self):
        arrays=self.arrays();arrays[2][2,2]=3
        with self.assertRaisesRegex(ValueError,'identity'):check_arrays(*arrays,{1})
        arrays=self.arrays();arrays[0][0,0]=0
        with self.assertRaisesRegex(ValueError,'Background'):check_arrays(*arrays,{1})

    def test_nonunit_normals_and_detached_feature_rejected(self):
        arrays=self.arrays();arrays[1][2,2]=[0,0,.5]
        with self.assertRaisesRegex(ValueError,'unit'):check_arrays(*arrays,{1})
        arrays=self.arrays();arrays[3][0,0]=1
        with self.assertRaisesRegex(ValueError,'outside'):check_arrays(*arrays,{1})


if __name__=='__main__':unittest.main()
