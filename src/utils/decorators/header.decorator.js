"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InsuranceApi;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
function InsuranceApi(...apiTag) {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiTags)(...apiTag));
}
//# sourceMappingURL=header.decorator.js.map