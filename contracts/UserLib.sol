// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library UserLib {

    struct User {
		uint ASN; // Autonomous System Number
        address addr; // The address of the participant
        uint ReportConflict; // The number of reported conflicts
		uint OnGoingVote; // The number of on-going Vote certificates
		uint FinishedVote; // The number of verified Vote certificates
	}

    function CreateUser(uint _ASN, address _address) public pure returns (User memory) {
        return User(_ASN, _address, 0, 0, 0);
    }

    
	
}
