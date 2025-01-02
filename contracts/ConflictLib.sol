// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library ConflictLib {

    struct Conflict {
        // identity
        uint256 ConflictID; // The ID of the conflict
        string IP_Prefix; // The IP prefix of the conflict
        uint[] MOAS; // The list of the ASN
        address Validator; // The address of the validator
        address Reporter; // The address of the reporter
        uint[] Voters; // The list of the voters
        uint Status; // The status of the conflict: 0 - new conflict, 1 - validator confirmed, 2 - voter selected, 3 - conflict resolved
        uint Options; // The number of options
        string[] OptionNames; // The name of the options
        uint Result; // The result of the conflict:
    }

    function generateOptionName(uint[] memory _MOAS) public pure returns (string[] memory) {
        uint len = _MOAS.length;
        uint combinations = 2 ** len; // 计算所有可能的组合数（包括空集）
        string[] memory optionNames = new string[](combinations);
        optionNames[0] = "None"; // 第一项是空集

        for (uint i = 1; i < combinations; i++) {
            string memory option = "";
            bool first = true;

            for (uint j = 0; j < len; j++) {
                if ((i >> j) & 1 == 1) {
                    if (first) {
                        option = uint2str(_MOAS[j]);
                        first = false;
                    } else {
                        option = string(abi.encodePacked(option, ",", uint2str(_MOAS[j])));
                    }
                }
            }
            optionNames[i] = option;
        }

        return optionNames;
    }

    function CreateConflict(uint256 _ID, string memory _IP_Prefix, uint[] memory _MOAS, address _Validator, address _Reporter) public pure returns (Conflict memory) {

        string[] memory OptionNames = generateOptionName(_MOAS);
        return Conflict(_ID, _IP_Prefix, _MOAS, _Validator, _Reporter, new uint[](0), 0, OptionNames.length, OptionNames, 0);
    }



    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
	
}
