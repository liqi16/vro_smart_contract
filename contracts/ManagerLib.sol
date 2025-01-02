// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library ManagerLib {

    struct Manager {
		// identity
		string name; // RIR or Autonomous System Number
        address addr; // The address of the manager
		uint OnGoingEvent; // The number of on-going events
		uint FinishedEvent; // The number of finished events
		uint RejectEvent; // The number of rejected events
	}

    function CreateManager(string memory _name, address _addr) public pure returns (Manager memory) {
        return Manager(_name, _addr, 0, 0, 0);
    }

	function SelectManager(
        mapping(address => Manager) storage managers, 
        address[] memory managerAddresses
    ) public view returns (address) {

        // uint totalWeight = 0;
        // uint[] memory weights = new uint[](managerAddresses.length);

        // // Calculate weights based on FinishedEvent, RejectEvent, and OnGoingEvent
        // for (uint i = 0; i < managerAddresses.length; i++) {
        //     Manager memory m = managers[managerAddresses[i]];

        //     // Assign weight with preference for high FinishedEvent, low RejectEvent, low OnGoingEvent
        //     uint weight = m.FinishedEvent * 10 + 1; // Prioritize high FinishedEvent
        //     weight = weight > m.RejectEvent * 5 ? weight - m.RejectEvent * 5 : 0; // Penalize RejectEvent
        //     weight = weight > m.OnGoingEvent * 3 ? weight - m.OnGoingEvent * 3 : 0; // Penalize OnGoingEvent

        //     weights[i] = weight;
        //     totalWeight += weight;
        // }

        // // If all weights are zero, we still need to pick a manager
        // if (totalWeight == 0) {
        //     uint randomIndex = uint(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % managerAddresses.length;
        //     return managerAddresses[randomIndex];
        // }

        // Select a manager randomly based on the calculated weights
        // uint random = uint(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % totalWeight;

        // Weighted random selection
        // uint cumulativeWeight = 0;
        // for (uint i = 0; i < managerAddresses.length; i++) {
        //     cumulativeWeight += weights[i];
        //     if (random < cumulativeWeight) {
        //         return managerAddresses[i];
        //     }
        // }

        // Fallback to ensure a manager is returned (this line should not be reached due to prior logic)
        // return managerAddresses[0];
        if (managerAddresses.length == 0) {
            return address(0);
        } else if (managerAddresses.length == 1) {
            return managerAddresses[0];
        } else{
            uint random = uint(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % managerAddresses.length;
            return managerAddresses[random];
        }
    }

    function ReSelectManager(
        address currentValidator,
        address[] memory managerAddresses
    ) public pure returns (address) {
        // Find the current ValidatorID
        uint ValidatorID = 0;
        for (uint i = 0; i < managerAddresses.length; i++) {
            if (currentValidator == managerAddresses[i]) {
                ValidatorID = i;
                break;
            }
        }
        // Next Validator
        ValidatorID = (ValidatorID + 1) % managerAddresses.length;
        return managerAddresses[ValidatorID];  
    }
}