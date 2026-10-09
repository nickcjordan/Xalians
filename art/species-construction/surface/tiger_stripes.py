"""Tiger stripe function (pattern kind 'tiger4'), written once for both numpy (the flat swatch) and Blender shader
nodes (the render), so the swatch and the coat are the same function.

Coordinates, all stored on the skin so the pattern follows the body when posed:
  a     angle around the body, 0 on the back midline (or a limb's outer side) to pi on the belly midline (or the
        limb's inner side), arc-length uniform on the trunk (build_surface.py, attribute 'angle')
  side  0 on the figure's right, 1 on its left (the two flanks get different seeds)
  h     height in row periods (stripe axis / period)
  edge  angle of the pale underside's edge at this point (attribute 'fielda'): a piece that reaches it ends
        there in its own point

Each row is a chain of lens-shaped segments along a. A segment is smooth (a sine bend on a smooth chevron
shear), thickest in its middle third and pointed at both ends. Rows alternate like brickwork: even rows open
with a chevron that crosses the spine (shared by both flanks, so the two halves meet in a V), odd rows open
a little off the spine, and the breaks of neighbouring rows fall at different places. Some segments fork into
two branches toward one end, a few are doubles (two thin parallel spears).
"""
import math

DEFAULTS = dict(
    hw=0.3,          # largest half width, in row periods
    wmin=0.6, wvar=0.7,  # half width = hw * (wmin + wvar*rand)
    taperIn=0.3,     # length of the taper at the spine end, fraction of the piece
    taperOut=0.45,     # length of the taper at the belly end
    seg=1.7,         # segment period along a, radians
    lmin=0.55, lvar=0.45,  # segment length = seg * (lmin + lvar*rand)
    jit=0.15,         # segment centre jitter along a, fraction of seg
    voff=0.14,        # segment vertical offset jitter, row periods (the interlock between pieces)
    oddPhase=0.22,    # odd rows' first segment starts this far off the spine, fraction of seg
    evenPhase=0.03,    # even rows' first segment starts here (negative: across the spine), fraction of seg
    chev=0.5, chevMax=1.5, chevRound=0.18,  # smooth chevron: rows rise by chev*chevMax*tanh(a/chevMax), rounded at the spine
    wave=0.035,        # S-curve along each piece, row periods
    wobble=0.03,      # width undulation along each piece, fraction
    forkSpine=0.6,    # fraction of forks that split toward the spine end rather than the belly end
    bend=0.1,        # sine bend of each segment, row periods
    sweep=0.08,
    tilt=0.3,         # random lean of each piece, row periods end to end       # each segment drifts down toward its belly end, row periods
    fork=0.14, forkAt=0.15, forkGap=0.2, forkWidth=0.6,  # fraction forked, where along the segment, branch spread, branch width
    double=0.14, doubleGap=0.3, doubleWidth=0.42,  # loops: fraction, half spread (row periods), spear width
    thinning=0.3,     # stripes slim by this fraction from the back to the pale edge
    aa=0.03,          # edge softness, row periods
    edgeGap=0.05,     # pieces stop this far short of the pale edge, radians
    minSpan=0.45,      # a piece cut shorter than this by the pale edge fades out, radians
    forkRise=0.6,     # the branches spread over this fraction of the piece, then run parallel
)


class NumpyOps:
    def __init__(self, np):
        self.np = np

    def floor(self, x): return self.np.floor(x)
    def sin(self, x): return self.np.sin(x)
    def abs(self, x): return self.np.abs(x)
    def max(self, a, b): return self.np.maximum(a, b)
    def min(self, a, b): return self.np.minimum(a, b)
    def tanh(self, x): return self.np.tanh(x)
    def sqrt(self, x): return self.np.sqrt(x)
    def pow(self, x, p): return self.np.power(self.np.maximum(x, 0.0), p)
    def fract(self, x): return x-self.np.floor(x)
    def lt(self, a, b): return (a < b)*1.0
    def clamp01(self, x): return self.np.clip(x, 0.0, 1.0)


class Expr:
    """A shader-node value with arithmetic operators, so stripe() can build Blender Math nodes unchanged."""
    def __init__(self, ops, socket):
        self.ops, self.s = ops, socket

    def _b(self, op, a, b):
        return self.ops.math(op, a, b)
    def __add__(self, o): return self._b('ADD', self, o)
    def __radd__(self, o): return self._b('ADD', o, self)
    def __sub__(self, o): return self._b('SUBTRACT', self, o)
    def __rsub__(self, o): return self._b('SUBTRACT', o, self)
    def __mul__(self, o): return self._b('MULTIPLY', self, o)
    def __rmul__(self, o): return self._b('MULTIPLY', o, self)
    def __truediv__(self, o): return self._b('DIVIDE', self, o)
    def __rtruediv__(self, o): return self._b('DIVIDE', o, self)
    def __neg__(self): return self._b('MULTIPLY', self, -1.0)


class NodeOps:
    """The same operations as NumpyOps, as Math nodes in a Blender node tree (Cycles evaluates them per shading point)."""
    def __init__(self, tree):
        self.t = tree
        self.count = 0

    def wrap(self, socket):
        return Expr(self, socket)

    def math(self, op, a, b=None, clamp=False):
        n = self.t.nodes.new('ShaderNodeMath')
        n.operation = op
        n.use_clamp = clamp
        self.count += 1
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, Expr):
                self.t.links.new(v.s, n.inputs[i])
            else:
                n.inputs[i].default_value = float(v)
        return Expr(self, n.outputs['Value'])

    def floor(self, x): return self.math('FLOOR', x)
    def sin(self, x): return self.math('SINE', x)
    def abs(self, x): return self.math('ABSOLUTE', x)
    def max(self, a, b): return self.math('MAXIMUM', a, b)
    def min(self, a, b): return self.math('MINIMUM', a, b)
    def tanh(self, x): return self.math('TANH', x)
    def sqrt(self, x): return self.math('SQRT', self.math('MAXIMUM', x, 0.0))
    def pow(self, x, p): return self.math('POWER', self.math('MAXIMUM', x, 0.0), p)
    def fract(self, x): return self.math('FRACT', x)
    def lt(self, a, b): return self.math('LESS_THAN', a, b)
    def clamp01(self, x): return self.math('ADD', x, 0.0, clamp=True)


def sm(X, x, a, b):
    t = X.clamp01((x-a)*(1.0/(b-a)))
    return t*t*(3.0-2.0*t)


def sm_var(X, x, a, b):
    """Smoothstep with non-constant edges."""
    t = X.clamp01((x-a)/(b-a))
    return t*t*(3.0-2.0*t)


def hash4(X, x, y):
    """Four values in 0..1 from two small numbers; sine-free so float32 shaders and float64 numpy agree closely."""
    out = []
    for k in range(4):
        p = X.fract(x*0.1031+y*0.1137+k*0.1379+0.0731)
        p = p*(p+33.33)
        p = X.fract(p*(p+p)+y*0.271)
        p = X.fract((p+0.137*k)*(p+19.19))
        out.append(p)
    return out


def segment(X, a, side, h, row, k, P, edge):
    even = 1.0-X.fract(row*0.5)*2.0               # 1 on even rows
    chevron = even*(1.0-X.min(X.abs(k), 1.0))       # the spine-crossing first piece of an even row
    s_seed = side*(1.0-chevron)                     # chevrons are shared by both flanks
    R1, R2, R3, R4 = hash4(X, row*1.618+k*7.31+s_seed*13.7+3.1, k*0.71+s_seed*5.3+row*0.37+1.7)
    R5, R6, R7, R8 = hash4(X, row*2.237+k*3.17+s_seed*9.1+7.9, k*1.31+s_seed*2.9+row*0.53+4.3)
    R9, R10, R11, R12 = hash4(X, row*0.917+k*5.03+s_seed*3.7+2.3, k*2.11+s_seed*7.7+row*0.29+6.1)
    phase = P['seg']*(even*P['evenPhase']+(1.0-even)*P['oddPhase'])
    length = P['seg']*(P['lmin']+P['lvar']*R2)
    start = phase+k*P['seg']+(R1-0.5)*P['jit']*P['seg']*(1.0-chevron)
    # a piece that would run into the pale underside ends at its edge instead, so it still comes to a point there
    end = X.min(start+length, edge-P['edgeGap'])
    span = X.max(end-start, 0.02)
    shortk = sm(X, span, P['minSpan'], P['minSpan']+0.35)   # pieces cut very short fade out instead of turning to stubs
    u = (a-start)/span
    alive = 1.0-X.lt(k, -0.5)                         # nothing before the first piece of a row
    inside = sm(X, u, 0.0, 0.002)*(1.0-sm(X, u, 0.998, 1.0))*alive
    uc = X.clamp01(u)
    # spear profile: parallel through the middle, convex ease-out tapers to sharp points at both ends (no flare),
    # the taper toward the belly longer than the one at the spine end
    t_in = X.clamp01(uc*(1.0/P['taperIn']))
    t_out = X.clamp01((1.0-uc)*(1.0/P['taperOut']))
    lens = t_in*(2.0-t_in)*t_out*(2.0-t_out)
    belly_thin = 1.0-P['thinning']*X.clamp01(a*(1.0/2.2))           # bold along the back, slimmer toward the belly
    hw = P['hw']*(P['wmin']+P['wvar']*R3)*belly_thin*lens*inside*shortk*(0.55+0.45*X.clamp01(span*(1.0/length)))
    voff = (R4-0.5)*2.0*P['voff']*(1.0-chevron)
    c = voff+P['bend']*(2.0*R5-1.0)*X.sin(uc*math.pi)+P['wave']*X.sin(uc*(2.0*math.pi)+R7*6.2832)-P['sweep']*uc
    c = c+(2.0*R9-1.0)*P['tilt']*(uc-0.5)*(1.0-chevron)          # each piece leans a little its own way
    hw = hw*(1.0+P['wobble']*X.sin(uc*(3.0*math.pi)+R5*6.2832))   # the edges undulate a little
    v = h-(row+0.5)-c
    # fork: from forkAt to one end (the belly end or the spine end) the spear splits into two thinner branches
    forked = X.lt(R6, P['fork'])*(1.0-chevron)
    toward_spine = X.lt(R7, P['forkSpine'])
    uf = toward_spine*(1.0-uc)+(1.0-toward_spine)*uc
    spread = sm(X, uf, P['forkAt'], P['forkAt']+P['forkRise'])*forked
    gap = P['forkGap']*spread
    main_w = hw*(1.0-spread)
    br_w = hw*P['forkWidth']*spread
    # loop: the piece opens into two thin spears that meet again at both ends (the long eye of a tiger's coat)
    dbl = X.lt(R8, P['double'])*(1.0-forked)*(1.0-chevron)
    dgap = dbl*P['doubleGap']*X.sqrt(X.sin(uc*math.pi))
    main_w = main_w*(1.0-dbl)
    d_w = hw*P['doubleWidth']*dbl

    def band(off, w):
        d = X.abs(v-off)
        return (1.0-sm_var(X, d, w-P['aa'], w+P['aa']*0.2))*sm(X, w, 0.004, 0.03)
    f = band(0.0, main_w)
    f = X.max(f, X.max(band(gap, br_w), band(-gap, br_w)))
    f = X.max(f, X.max(band(dgap, d_w), band(-dgap, d_w)))
    return f


def stripe(X, a, side, h, P=None, edge=10.0):
    P = {**DEFAULTS, **(P or {})}
    ar = X.sqrt(a*a+P['chevRound']**2)-P['chevRound']
    shear = P['chev']*P['chevMax']*X.tanh(ar*(1.0/P['chevMax']))
    hs = h-shear
    base = X.floor(hs)
    f = 0.0
    for dr in (-1.0, 0.0, 1.0):
        row = base+dr
        even = 1.0-X.fract(row*0.5)*2.0
        phase = P['seg']*(even*P['evenPhase']+(1.0-even)*P['oddPhase'])
        k0 = X.floor((a-phase)*(1.0/P['seg']))
        for dk in (-1.0, 0.0, 1.0):
            g = segment(X, a, side, hs, row, k0+dk, P, edge)
            f = g if isinstance(f, float) else X.max(f, g)
    return f
