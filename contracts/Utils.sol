// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library Utils {

    function IsInArray(uint[] memory arr, uint target) public pure returns (uint, bool) {
        for (uint i = 0; i < arr.length; i++) {
            if (arr[i] == target) {
                return (i, true);
            }
        }
        return (0, false);
    }

}