const { expect } = require("chai");
const { ethers } = require("hardhat");
const {circomlibjs} = require("circomlibjs");
const zkTree = require("./zkTree");

async function getEvent(address) {
    const provider = new ethers.providers.JsonRpcProvider({
        url: 'http://127.0.0.1:8545',
        ensAddress: null  // 禁用 ENS 功能
    });

    // 检查网络是否正确连接
    const network = await provider.getNetwork();
    console.log("Connected to network:", network);

    const abi = [
        "event Commit(bytes32 indexed commitment,uint32 leafIndex,uint256 timestamp)"
    ];
    const contract = await new ethers.Contract(address, abi, provider)
    const events = await contract.queryFilter(contract.filters.Commit())
    // console.log(events)
    let commitments = []
    for (let event of events) {
        console.log(event.args.commitment)
        commitments.push(ethers.BigNumber.from(event.args.commitment))
    }
    console.log("commitment")
    console.log(commitments)
}

//level, nullifier, secret, currentCommitment, historyCommitments
async function main() {
    const args = process.argv.slice(2);
    // const args_num = args.length;
    const address = args[0];
    await getEvent(address);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});


