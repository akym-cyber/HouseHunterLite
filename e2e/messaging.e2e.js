describe('Messaging', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should send a message', async () => {
    // Navigate to messages tab
    await element(by.id('messages-tab')).tap();

    // Select a conversation
    await element(by.id('conversation-item')).atIndex(0).tap();

    // Type a message
    await element(by.id('message-input')).typeText('Hello from E2E test!');

    // Send the message
    await element(by.id('send-button')).tap();

    // Verify message appears
    await expect(element(by.text('Hello from E2E test!'))).toBeVisible();
  });

  it('should display typing indicator', async () => {
    await element(by.id('messages-tab')).tap();
    await element(by.id('conversation-item')).atIndex(0).tap();

    // Start typing
    await element(by.id('message-input')).typeText('Typing');

    // Check for typing indicator
    await expect(element(by.text('Someone is typing...'))).toBeVisible();

    // Stop typing (clear input)
    await element(by.id('message-input')).clearText();

    // Typing indicator should disappear
    await expect(element(by.text('Someone is typing...'))).not.toBeVisible();
  });

  it('should share an image', async () => {
    await element(by.id('messages-tab')).tap();
    await element(by.id('conversation-item')).atIndex(0).tap();

    // Open media picker
    await element(by.id('media-button')).tap();

    // Select image option
    await element(by.text('Take Photo')).tap();

    // Mock camera permission and photo selection
    // This would need to be mocked in the test setup

    // Verify image upload progress
    await expect(element(by.id('upload-progress'))).toBeVisible();

    // Verify image message appears
    await expect(element(by.text('📷 Photo'))).toBeVisible();
  });

  it('should record and send voice message', async () => {
    await element(by.id('messages-tab')).tap();
    await element(by.id('conversation-item')).atIndex(0).tap();

    // Start recording
    await element(by.id('voice-record-button')).longPress();

    // Wait for recording duration
    await waitFor(element(by.id('recording-duration'))).toBeVisible();

    // Stop recording and send
    await element(by.id('voice-record-button')).tap();

    // Verify voice message appears
    await expect(element(by.text('🎤 Voice Message'))).toBeVisible();
  });

  it('should handle message reactions', async () => {
    await element(by.id('messages-tab')).tap();
    await element(by.id('conversation-item')).atIndex(0).tap();

    // Long press on a message
    await element(by.id('message-bubble')).atIndex(0).longPress();

    // Select reaction
    await element(by.text('👍')).tap();

    // Verify reaction appears
    await expect(element(by.text('👍 1'))).toBeVisible();
  });
});
