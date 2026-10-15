"""Fixed, geometry-derived tail coordinates and saved-strand width measurements."""
import json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d
from scipy.spatial import cKDTree


def unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-10)


def coordinates(d, flags, nearest):
    co, edges = d['co'], d['edges']
    mask = flags['actualTailSkin']
    ee = edges[mask[edges].all(1)]
    g = coo_matrix((np.ones(len(ee)*2),
                   (np.r_[ee[:, 0], ee[:, 1]], np.r_[ee[:, 1], ee[:, 0]])),
                  shape=(len(co), len(co)))
    _, labels = connected_components(g, directed=False)
    ids, counts = np.unique(labels[mask], return_counts=True)
    ids = sorted(ids[counts > 100], key=lambda i: -co[labels == i, 2].mean())
    result = []
    for number, label in enumerate(ids):
        m = labels == label
        t = d['attr_tailpos'][m]
        grid = np.linspace(t.min(), t.max(), 65)
        centers = np.array([co[m][abs(t-v) < .012].mean(0) for v in grid])
        centers = gaussian_filter1d(centers, 1.5, axis=0, mode='nearest')
        spline = CubicSpline(grid, centers, bc_type='natural')
        result.append(dict(number=number+1, selected=m[nearest], grid=grid,
                           spline=spline, skin=m))
    return result


def widths(d, tails, nearest):
    starts = d['starts']; ends = np.r_[starts[1:]-1, len(d['points'])-1]
    counts=np.diff(np.r_[starts,len(d['points'])])
    result = []
    for tail in tails:
        m = tail['selected']; grid = tail['grid']; spl = tail['spline']
        dense = np.linspace(grid[0], grid[-1], 2048)
        samples=np.vstack((d['points'][np.repeat(m,counts)],d['co'][tail['skin']]))
        # Locate every saved path sample spatially, independent of source roots.
        t = dense[cKDTree(spl(dense)).query(samples)[1]]
        center = spl(t); tangent = unit(spl(t, 1))
        # Keep overshooting hairs at their actual longitudinal position instead
        # of collapsing a whole terminal cloud into one endpoint station.
        for endpoint,which in [(grid[0],t==grid[0]),(grid[-1],t==grid[-1])]:
            axis=unit(spl(endpoint,1));projection=(samples-spl(endpoint))@axis
            outside=which & ((projection<0) if endpoint==grid[0] else (projection>0))
            t[outside]=endpoint+projection[outside]/np.linalg.norm(spl(endpoint,1))
            center[outside]=spl(endpoint)+projection[outside,None]*axis
            tangent[outside]=axis
        station = np.linspace(grid[0], grid[-1], 48)
        views = {}
        # Orthographic side/back transverse widths from actual saved strand tips.
        # Every tail uses the same immutable skin stations before and after.
        for name, camera in [('side', [np.cos(np.deg2rad(4)), 0, np.sin(np.deg2rad(4))]),
                             ('back', [0, np.cos(np.deg2rad(4)), np.sin(np.deg2rad(4))])]:
            transverse = unit(np.cross(tangent, np.array(camera)))
            q = np.sum((samples-center)*transverse, axis=1)
            values = []; populations = [];extrema=[]
            for v in station:
                subset = q[abs(t-v) <= (grid[-1]-grid[0])/47*.65]
                values.append(float(np.percentile(subset, 99)-np.percentile(subset, 1)))
                extrema.append(float(np.ptp(subset)))
                populations.append(len(subset))
            values = np.array(values)
            mid = (station >= grid[0]+.4*np.ptp(grid)) & (station <= grid[0]+.6*np.ptp(grid))
            views[name] = dict(width=values.tolist(), extrema=extrema,populations=populations,
                               largestJump=float(abs(np.diff(values)).max()),
                               midWidth=float(np.median(values[mid])))
        result.append(dict(tail=tail['number'], station=station.tolist(), views=views))
    return result


if __name__ == '__main__':
    import sys
    folder = Path(sys.argv[1]); d = np.load(folder/'evidence.npz')
    flags = np.load(folder/'sweep-flags.npz'); c = np.load(folder/'collision-evidence.npz')
    result = widths(d, coordinates(d, flags, c['nearest']), c['nearest'])
    output = Path(sys.argv[2]) if len(sys.argv)>2 else folder/'widths.json'
    output.write_text(json.dumps(result, indent=2))
    print([(x['tail'], {k:(v['largestJump'],v['midWidth']) for k,v in x['views'].items()}) for x in result])
