import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../../communication/notification/notification.service';
import { UserRepository } from '../../../core/user/user.repository';
import { UserRole } from '../../../core/auth/auth.types';
import { EventEntity, EventAudience } from '../entities/event.entity';
import {
  EventAction,
  EventNotificationLogs,
} from '../constants/event-notification.constants';
import { FeatureFlagsService } from '../../../core/feature-flags/feature-flags.service';
import { FeatureFlagKeys } from '../../../core/feature-flags/enums/feature-flag-keys.enum';


@Injectable()
export class EventNotificationHelper {
  private readonly logger = new Logger(EventNotificationHelper.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userRepo: UserRepository,
    private readonly featureFlagsService: FeatureFlagsService,
  ) { }

  async notifyEventCreated(event: EventEntity): Promise<void> {
    const isEnabled = await this.isFeatureEnabled();
    if (!isEnabled) {
      this.logger.log('Event email notifications are disabled by feature flag');
      return;
    }

    this.logger.log(EventNotificationLogs.NOTIFICATION_STARTED(event.id, EventAction.CREATED));

    try {
      const recipientEmails = await this.getRecipientEmailsByAudience(event.audience);

      if (recipientEmails.length === 0) {
        this.logger.warn(EventNotificationLogs.NO_RECIPIENTS(event.audience));
        return;
      }

      await this.sendNotification(event, EventAction.CREATED, recipientEmails);

      this.logger.log(
        EventNotificationLogs.NOTIFICATION_COMPLETED(event.id, recipientEmails.length),
      );
    } catch (error) {
      this.logger.error(`Error sending event created notification: ${error.message}`);
    }
  }

  async notifyEventDeleted(event: EventEntity): Promise<void> {
    const isEnabled = await this.isFeatureEnabled();
    if (!isEnabled) {
      this.logger.log('Event email notifications are disabled by feature flag');
      return;
    }

    this.logger.log(EventNotificationLogs.NOTIFICATION_STARTED(event.id, EventAction.DELETED));

    try {
      const recipientEmails = await this.getRecipientEmailsByAudience(event.audience);

      if (recipientEmails.length === 0) {
        this.logger.warn(EventNotificationLogs.NO_RECIPIENTS(event.audience));
        return;
      }

      await this.sendNotification(event, EventAction.DELETED, recipientEmails);

      this.logger.log(
        EventNotificationLogs.NOTIFICATION_COMPLETED(event.id, recipientEmails.length),
      );
    } catch (error) {
      this.logger.error(`Error sending event deleted notification: ${error.message}`);
    }
  }

  async notifyEventUpdated(
    originalEvent: EventEntity,
    updatedEvent: EventEntity,
  ): Promise<void> {
    const isEnabled = await this.isFeatureEnabled();
    if (!isEnabled) {
      this.logger.log('Event email notifications are disabled by feature flag');
      return;
    }

    this.logger.log(
      EventNotificationLogs.NOTIFICATION_STARTED(updatedEvent.id, EventAction.UPDATED),
    );

    try {
      const dateChanged = originalEvent.date !== updatedEvent.date;
      const locationChanged = originalEvent.location !== updatedEvent.location;
      const titleChanged = originalEvent.title !== updatedEvent.title;
      const descriptionChanged = originalEvent.description !== updatedEvent.description;
      const audienceChanged = originalEvent.audience !== updatedEvent.audience;

      const hasRelevantChanges =
        dateChanged || locationChanged || titleChanged || descriptionChanged || audienceChanged;

      if (!hasRelevantChanges) {
        this.logger.log(`No relevant changes for event ${updatedEvent.id}, skipping notification`);
        return;
      }

      if (audienceChanged) {
        await this.handleAudienceChange(originalEvent, updatedEvent);
      } else {
        const recipientEmails = await this.getRecipientEmailsByAudience(updatedEvent.audience);

        if (recipientEmails.length > 0) {
          const action = this.determineUpdateAction(
            dateChanged,
            locationChanged,
            titleChanged,
            descriptionChanged,
          );

          await this.sendNotification(updatedEvent, action, recipientEmails);
          this.logger.log(
            EventNotificationLogs.NOTIFICATION_COMPLETED(updatedEvent.id, recipientEmails.length),
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error sending event updated notification: ${error.message}`);
    }
  }

  private async handleAudienceChange(
    originalEvent: EventEntity,
    updatedEvent: EventEntity,
  ): Promise<void> {
    const oldAudience = originalEvent.audience;
    const newAudience = updatedEvent.audience;

    this.logger.log(
      `Audience changed from ${oldAudience} to ${newAudience} for event ${updatedEvent.id}`,
    );

    if (
      oldAudience === EventAudience.LEADERS &&
      (newAudience === EventAudience.MEMBERS || newAudience === EventAudience.ALL)
    ) {
      const memberEmails = await this.getEmailsByRoles([UserRole.MEMBER]);
      if (memberEmails.length > 0) {
        await this.sendNotification(updatedEvent, EventAction.CREATED, memberEmails);
        this.logger.log(`Sent NEW EVENT to ${memberEmails.length} members who gained access`);
      }

      const leaderAdminEmails = await this.getEmailsByRoles([UserRole.LEADER, UserRole.ADMIN]);
      if (leaderAdminEmails.length > 0) {
        await this.sendNotification(updatedEvent, EventAction.AUDIENCE_CHANGED, leaderAdminEmails);
        this.logger.log(`Sent AUDIENCE CHANGE to ${leaderAdminEmails.length} leaders/admins`);
      }
      return;
    }

    if (
      (oldAudience === EventAudience.MEMBERS || oldAudience === EventAudience.ALL) &&
      newAudience === EventAudience.LEADERS
    ) {
      const memberEmails = await this.getEmailsByRoles([UserRole.MEMBER]);
      if (memberEmails.length > 0) {
        await this.sendNotification(updatedEvent, EventAction.LOST_ACCESS, memberEmails);
        this.logger.log(`Sent LOST ACCESS to ${memberEmails.length} members who lost access`);
      }

      const leaderAdminEmails = await this.getEmailsByRoles([UserRole.LEADER, UserRole.ADMIN]);
      if (leaderAdminEmails.length > 0) {
        await this.sendNotification(updatedEvent, EventAction.AUDIENCE_CHANGED, leaderAdminEmails);
        this.logger.log(`Sent AUDIENCE CHANGE to ${leaderAdminEmails.length} leaders/admins`);
      }
      return;
    }

    if (
      (oldAudience === EventAudience.MEMBERS && newAudience === EventAudience.ALL) ||
      (oldAudience === EventAudience.ALL && newAudience === EventAudience.MEMBERS)
    ) {
      const allRegisteredEmails = await this.getEmailsByRoles([
        UserRole.MEMBER,
        UserRole.LEADER,
        UserRole.ADMIN,
      ]);
      if (allRegisteredEmails.length > 0) {
        await this.sendNotification(
          updatedEvent,
          EventAction.AUDIENCE_CHANGED,
          allRegisteredEmails,
        );
        this.logger.log(
          `Sent AUDIENCE CHANGE to ${allRegisteredEmails.length} registered users`,
        );
      }
      return;
    }
  }

  private async getEmailsByRoles(roles: UserRole[]): Promise<string[]> {
    const users = await this.userRepo.findByRoles(roles);
    return users.filter((u) => u.active && u.email).map((u) => u.email);
  }

  private determineUpdateAction(
    dateChanged: boolean,
    locationChanged: boolean,
    titleChanged: boolean,
    descriptionChanged: boolean,
  ): EventAction {
    if (titleChanged || descriptionChanged) {
      return EventAction.UPDATED;
    }

    if (dateChanged && !locationChanged) {
      return EventAction.DATE_CHANGED;
    }

    if (locationChanged && !dateChanged) {
      return EventAction.LOCATION_CHANGED;
    }

    return EventAction.UPDATED;
  }

  private async getRecipientEmailsByAudience(audience: EventAudience): Promise<string[]> {
    switch (audience) {
      case EventAudience.ALL:
      case EventAudience.MEMBERS:
        return this.getEmailsByRoles([UserRole.MEMBER, UserRole.LEADER, UserRole.ADMIN]);

      case EventAudience.LEADERS:
        return this.getEmailsByRoles([UserRole.LEADER, UserRole.ADMIN]);

      default:
        return [];
    }
  }

  private async sendNotification(
    event: EventEntity,
    action: EventAction,
    recipientEmails: string[],
  ): Promise<void> {
    await this.notificationService.sendEventNotification(
      {
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
      },
      action,
      recipientEmails,
    );
  }

 
  private async isFeatureEnabled(): Promise<boolean> {
    try {
      return await this.featureFlagsService.isEnabled(
        FeatureFlagKeys.EVENT_EMAIL_NOTIFICATIONS,
      );
    } catch (error) {
      this.logger.error(`Error checking feature flag: ${error.message}`);
      return false;
    }
  }
}
