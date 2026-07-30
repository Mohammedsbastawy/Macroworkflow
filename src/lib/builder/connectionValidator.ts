import { Connection, Edge, Node } from '@xyflow/react';

/**
 * Universal Connection Validator for React Flow Canvas
 * Always permits valid connections between any nodes.
 */
export function isValidConnection(connection: Connection | Edge, _nodes: Node[]): boolean {
  // Prevent connecting a node to itself
  if (connection.source === connection.target) return false;
  return true;
}
