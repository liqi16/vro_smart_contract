// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./ManagerLib.sol";

contract ManagerManager {
    mapping(address => ManagerLib.Manager) public managers;
    address[] public managerAddresses;
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

    function initialize(address _vro_contract, address[5] memory RIRs) public onlyDeployer {
        string[5] memory RIRNames = ["AFRINIC", "APNIC", "ARIN", "LACNIC", "RIPE NCC"];
        for (uint i = 0; i < RIRs.length; i++) {
            if (managers[RIRs[i]].addr == address(0)) {
                ManagerLib.Manager memory newManager = ManagerLib.CreateManager(RIRNames[i], RIRs[i]);
                managers[RIRs[i]] = newManager;
                managerAddresses.push(RIRs[i]);
        }
        }
        vro_contract = _vro_contract;
        isInitialized = true;
    }
    

    function createManager(string memory _name, address _address) public onlyVRO returns (bool) {
        if (managers[_address].addr == address(0)) {
            ManagerLib.Manager memory newManager = ManagerLib.CreateManager(_name, _address);
            managers[_address] = newManager;
            managerAddresses.push(_address);
            return true;
        }
        return false;
    }

    function isManager(address _addr) public view onlyVRO() returns (bool) {
        return managers[_addr].addr != address(0);
    }

    function getManager(address _addr) public view onlyVRO() returns (ManagerLib.Manager memory) {
        return managers[_addr];
    }

    function getAllManager() public view onlyVRO() returns (address[] memory) {
        return managerAddresses;
    }

    function selectValidator() public view onlyVRO returns (address) {
        return ManagerLib.SelectManager(managers, managerAddresses);
    }

    function incrementOnGoingEvent(address _addr) public onlyVRO {
        managers[_addr].OnGoingEvent++;
    }

    function decrementOnGoingEvent(address _addr) public onlyVRO {
        managers[_addr].OnGoingEvent--;
    }

    function incrementRejectEvent(address _addr) public onlyVRO {
        managers[_addr].RejectEvent++;
    }

    function incrementFinishedEvent(address _addr) public onlyVRO {
        managers[_addr].FinishedEvent++;
    }

    function reSelectValidator(address currentValidator) public view onlyVRO returns (address){
        return ManagerLib.ReSelectManager(currentValidator, managerAddresses);
    }

}
