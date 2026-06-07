// Compute bob2 position given angles and arm lengths
// Defines: computeBob2(theta1, theta2, l1, l2, out x2, out y2)

void computeBob2(float theta1, float theta2, float l1, float l2, out float x2, out float y2) {
    float x1 = l1 * sin(theta1);
    float y1 = -l1 * cos(theta1);
    x2 = x1 + l2 * sin(theta2);
    y2 = y1 - l2 * cos(theta2);
}
