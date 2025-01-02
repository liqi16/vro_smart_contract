// based on https://github.com/tornadocash/fixed-merkle-tree

const crypto = require('crypto')
const snarkjs = require('snarkjs')
const circomlibjs = require('circomlibjs')
const buildMimcSponge = circomlibjs.buildMimcSponge
const ethers = require('ethers')
const BigNumber = ethers.BigNumber
const Contract = ethers.Contract

const ZERO_VALUE = BigNumber.from('21663839004416932945382355908790599225266501822907911457504978515578255421292') // = keccak256("tornado") % FIELD_SIZE

const loadWebAssembly = require("./Verifier")

function getVerifierWASM() {
    return loadWebAssembly().buffer
}

function calculateHash(mimc, left, right) {
    return BigNumber.from(mimc.F.toString(mimc.multiHash([left, right])))
}

async function generateCommitment() {
    const mimc = await buildMimcSponge();
    const nullifier = BigNumber.from(crypto.randomBytes(31)).toString()
    const secret = BigNumber.from(crypto.randomBytes(31)).toString()
    const commitment = mimc.F.toString(mimc.multiHash([nullifier, secret]))
    const nullifierHash = mimc.F.toString(mimc.multiHash([nullifier]))
    return {
        nullifier: nullifier,
        secret: secret,
        commitment: commitment,
        nullifierHash: nullifierHash
    }
}

function generateZeros(mimc, levels) {
    let zeros = []
    zeros[0] = ZERO_VALUE
    for (let i = 1; i <= levels; i++)
        zeros[i] = calculateHash(mimc, zeros[i - 1], zeros[i - 1]);
    return zeros
}

// calculates Merkle root from elements and a path to the given element 
function calculateMerkleRootAndPath(mimc, levels, elements, element) {
    const capacity = 2 ** levels
    if (elements.length > capacity) throw new Error('Tree is full')

    const zeros = generateZeros(mimc, levels);
    let layers = []
    layers[0] = elements.slice()
    for (let level = 1; level <= levels; level++) {
        layers[level] = []
        for (let i = 0; i < Math.ceil(layers[level - 1].length / 2); i++) {
            layers[level][i] = calculateHash(
                mimc,
                layers[level - 1][i * 2],
                i * 2 + 1 < layers[level - 1].length ? layers[level - 1][i * 2 + 1] : zeros[level - 1],
            )
        }
    }

    const root = layers[levels].length > 0 ? layers[levels][0] : zeros[levels - 1]

    let pathElements = []
    let pathIndices = []

    if (element) {
        const bne = BigNumber.from(element)
        let index = layers[0].findIndex(e => BigNumber.from(e).eq(bne))
        // console.log('idx: ' + index)
        for (let level = 0; level < levels; level++) {
            pathIndices[level] = index % 2
            pathElements[level] = (index ^ 1) < layers[level].length ? layers[level][index ^ 1] : zeros[level]
            index >>= 1
        }
    }

    return {
        root: root.toString(),
        pathElements: pathElements.map((v) => v.toString()),
        pathIndices: pathIndices.map((v) => v.toString())
    }
}

function checkMerkleProof(mimc, levels, pathElements, pathIndices, element) {
    // console.log(pathElements)
    // console.log(pathIndices)
    let hashes = []
    for (let i = 0; i < levels; i++) {
        const in0 = (i == 0) ? element : hashes[i - 1]
        const in1 = pathElements[i]
        // console.log(`in0: ${in0} in1: ${in1}`)
        if (pathIndices[i] == 0) {
            hashes[i] = calculateHash(mimc, in0, in1)
        } else {
            hashes[i] = calculateHash(mimc, in1, in0)
        }
        // console.log(`in0: ${in0} in1: ${in1} hash: ${hashes[i]}`)
    }
    return hashes[levels - 1]
}

async function calculateMerkleRootAndPathFromEvents(mimc, address, provider, levels, element) {
    const abi = [
        "event Commit(bytes32 indexed commitment,uint32 leafIndex,uint256 timestamp)"
    ];
    const contract = new Contract(address, abi, provider)
    const events = await contract.queryFilter(contract.filters.Commit())
    console.log(events)
    let commitments = []
    for (let event of events) {
        console.log(event.args.commitment)
        commitments.push(BigNumber.from(event.args.commitment))
    }
    return calculateMerkleRootAndPath(mimc, levels, commitments, element)
}

function convertCallData(calldata) {
    const argv = calldata
        .replace(/["[\]\s]/g, "")
        .split(",")
        .map((x) => BigNumber.from(x).toString());

    const a = [argv[0], argv[1]];
    const b = [
        [argv[2], argv[3]],
        [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const input = [argv[8], argv[9]];

    return { a, b, c, input };
}


async function calculateMerkleRootAndZKProof(address, provider, levels, commitment, zkey) {
    const mimc = await buildMimcSponge();
    const rootAndPath = await calculateMerkleRootAndPathFromEvents(mimc, address, provider, levels, commitment.commitment);
    // console.log(rootAndPath);
    // console.log(getVerifierWASM());
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
            nullifier: commitment.nullifier, secret: commitment.secret,
            pathElements: rootAndPath.pathElements, pathIndices: rootAndPath.pathIndices
        },
        getVerifierWASM(),
        zkey);
    const cd = convertCallData(await snarkjs.groth16.exportSolidityCallData(proof, publicSignals));
    const result = {
        nullifierHash: publicSignals[0],
        root: publicSignals[1],
        proof_a: cd.a,
        proof_b: cd.b,
        proof_c: cd.c
    }
    console.log(result);
    return result
}

module.exports = {
    generateCommitment,
    checkMerkleProof,
    calculateMerkleRootAndZKProof
};