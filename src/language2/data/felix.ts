/**
 * Re-export FELIX hover data source from the original language module.
 * Wraps the existing implementation for use by the new hover provider.
 */

import * as vscode from 'vscode';
import { FELIX } from '../../language/hoverFelix';

export { FELIX };
