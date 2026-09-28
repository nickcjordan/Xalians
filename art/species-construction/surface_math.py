"""Monotone section interpolation for authored organic surface cages."""


def profile(rows, value):
    """Piecewise cubic Hermite interpolation with monotone, shared node slopes.

    Opposed secants give a zero slope at a local extremum. Harmonic means keep
    adjacent intervals tangent-continuous without clipping the resulting curve.
    """
    if value <= rows[0][0]:
        return rows[0][1:]
    if value >= rows[-1][0]:
        return rows[-1][1:]
    k = next(i for i in range(len(rows)-1) if rows[i][0] <= value <= rows[i+1][0])
    h = [b[0]-a[0] for a,b in zip(rows,rows[1:])]
    if any(v <= 0 for v in h):
        raise ValueError('Section coordinates must strictly increase')
    t = (value-rows[k][0])/h[k]
    result=[]
    for col in range(1,len(rows[0])):
        secants=[(b[col]-a[col])/step for a,b,step in zip(rows,rows[1:],h)]
        def slope(i):
            if i==0: return secants[0]
            if i==len(rows)-1: return secants[-1]
            a,b=secants[i-1],secants[i]
            if a*b<=0: return 0
            w1,w2=2*h[i]+h[i-1],h[i]+2*h[i-1]
            return (w1+w2)/(w1/a+w2/b)
        v=(2*t**3-3*t*t+1)*rows[k][col]+(t**3-2*t*t+t)*h[k]*slope(k)
        v+=(-2*t**3+3*t*t)*rows[k+1][col]+(t**3-t*t)*h[k]*slope(k+1)
        result.append(v)
    return result
