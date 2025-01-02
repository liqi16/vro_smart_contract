// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./UserLib.sol";

contract UserManager {
    // mapping(address => UserLib.User) public users;
    mapping(uint => UserLib.User) public users;
    // address[] public userAddresses;
    uint[] public userASN;
    address immutable deployer;
    address public vro_contract;
    bool public isInitialized;

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer, "ER1");
        _;
    }

    modifier onlyVRO() {
        require(isInitialized == true, "ER3");
        require(msg.sender == vro_contract, "ER2");
        _;
    }

    function initialize(address _vro_contract) public onlyDeployer {
        vro_contract = _vro_contract;
        isInitialized = true;
    }

    function createParticipant(address _userAddr, uint _ASN) public onlyVRO returns (bool) {
        if (users[_ASN].addr == address(0)) {
            UserLib.User memory newUser = UserLib.CreateUser(_ASN,_userAddr);
            users[_ASN] = newUser;
            userASN.push(_ASN);
            return true;
        }
        return false;
    }

    function isParticipant(uint asn, address addr) public view onlyVRO returns (bool) {
        if (users[asn].addr == address(0)) {
            return false;
        }
        return users[asn].addr == addr;
    }

    function getParticipant(uint asn) public view onlyVRO returns (UserLib.User memory) {
        return users[asn];
    }

    function getAllParticipant() public view onlyVRO returns (uint[] memory) {
        return userASN;
    }

    function incrementReportConflict(uint asn) onlyVRO public {
        users[asn].ReportConflict++;
    }

    function incrementOnGoingVote(uint asn) onlyVRO public {
        users[asn].OnGoingVote++;
    }

    function decrementOnGoingVote(uint asn) onlyVRO public {
        users[asn].OnGoingVote--;
    }

    function getUserAddressByIndex(uint asn) public view onlyVRO returns (address) {
        return users[asn].addr;
    }

    function incrementFinishedVote(uint asn) onlyVRO public {
        users[asn].FinishedVote++;
    }
}
