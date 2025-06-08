/**
 * HeaderBlockTemplate - TypeScript header template for imajin-cli generated files
 * 
 * @package     @imajin/cli
 * @subpackage  generation
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-04
 *
 * @see        docs/generation/header-standards.md
 * 
 * Integration Points:
 * - Code generation templates
 * - File header standardization
 * - LLM integration point documentation
 */

/**
 * TEMPLATE FORMAT - Use this exact format for all generated TypeScript files:
 * 
 * /**
 *  * [ClassName] - [Brief Description]
 *  * 
 *  * @package     @imajin/cli
 *  * @subpackage  [ServiceName]
 *  * @author      VETEZE
 *  * @copyright   imajin
 *  * @license     .fair LICENSING AGREEMENT
 *  * @version     0.1.0
 *  * @since       2025-06-04
 *  *
 *  * @see        [Documentation]
 *  * 
 *  * Integration Points:
 *  * - [Integration Point 1]
 *  * - [Integration Point 2]
 *  * /
 * 
 * import type { [TypeImports] } from './types/index.js';
 * 
 * // TypeScript class/interface/function definition
 */

// Example usage:
export interface HeaderTemplate {
  className: string;
  description: string;
  subpackage: string;
  author: string;
  documentation: string;
  integrationPoints: string[];
  typeImports?: string[];
  currentYMD: Date;
}

export const generateHeader = (template: HeaderTemplate): string => {
  const integrationPointsList = template.integrationPoints
    .map(point => ` * - ${point}`)
    .join('\n');
    
  const typeImports = template.typeImports?.length 
    ? `import type { ${template.typeImports.join(', ')} } from './types/index.js';`
    : `// No type imports needed`;

  return `/**
 * ${template.className} - ${template.description}
 * 
 * @package     @imajin/cli
 * @subpackage  ${template.subpackage}
 * @author      ${template.author}
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       ${template.currentYMD}
 *
 * @see        ${template.documentation}
 * 
 * Integration Points:
${integrationPointsList}
 */

${typeImports}

// TypeScript implementation here
`;
}; 