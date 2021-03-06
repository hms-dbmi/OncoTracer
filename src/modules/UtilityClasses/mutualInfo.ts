/**
X : array-like or sparse matrix, shape (n_samples, n_features)
    Feature matrix.
y : array-like of shape (n_samples,)
    Target vector.
discrete_features : {'auto', bool, array-like}, default='auto'
    If bool, then determines whether to consider all features discrete
    or continuous. If array, then it should be either a boolean mask
    with shape (n_features,) or array with indices of discrete features.
    If 'auto', it is assigned to False for dense `X` and to True for
    sparse `X`.
discrete_target : bool, default=False
    Whether to consider `y` as a discrete variable.
n_neighbors : int, default=3
    Number of neighbors to use for MI estimation for continuous variables,
    see [1]_ and [2]_. Higher values reduce variance of the estimation, but
    could introduce a bias. 
 */

const estimateMI =(X:number[][], y:number[], XDiscrete: boolean[], yDiscrete:boolean, numNeighbors:number):number[]=>{
    let mi = X.map((x,i)=>{
        return computeMI(x, y, XDiscrete[i], yDiscrete, numNeighbors)
    })
    return mi
}
const computeMI = (x:number[], y:number[], xDiscrete: boolean, yDiscrete:boolean, numNeighbors:number):number=>{
    if (xDiscrete && yDiscrete){
        return mutualInfoScore(x, y)
    }else if (xDiscrete && !yDiscrete){
        return computeMIcd(y, x, numNeighbors)
    }else if (!xDiscrete && yDiscrete){
        return computeMIcc(y, x, numNeighbors)
    }
    return mutualInfoScore(x, y)
}

const mutualInfoScore = (x:number[], y:number[]):number=>{
    return 0
}

const computeMIcd = (x:number[], y:number[], numNeighbors:number):number=>{
    return 0
}

const computeMIcc = (x:number[], y:number[], numNeighbors:number):number=>{
    return 0
}

const contingencyMatrix = (x:number[], y:number[])=>{
    
}
export {estimateMI}